from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
import uuid

from app.db.schemas import RequestCreate, RequestResponse, Session, User
from app.db.supabase import supabase
from app.agents.orchestrator import start_workflow, resume_workflow
from fastapi import Depends
from app.api.dependencies import get_current_user

from mcp_server.tools.trace_tools import create_session, CreateSessionInput

router = APIRouter()


async def run_orchestrator_task(user_input: str, user_id: str, session_id: str):
    """
    Background task that runs Phase 1 of the HITL orchestration.
    If the SDK pauses for booking approval, stores the RunState in the DB.
    Otherwise completes the full workflow.
    """
    try:
        result = await start_workflow(user_input, user_id, session_id)

        if result["status"] == "pending_approval":
            # Store the serialised RunState and provider summary for Phase 2
            supabase.table("sessions").update({
                "hitl_state": result["state_payload"],
                "hitl_status": "pending_approval",
                "provider_summary": result.get("provider_summary"),
                "status": "pending_approval",
            }).eq("id", session_id).execute()
            print(f"[HITL] Session {session_id} paused for booking approval.")
        else:
            print(f"[HITL] Session {session_id} completed without HITL pause.")

    except Exception as e:
        import traceback
        print(f"Orchestrator task failed: {e}")
        traceback.print_exc()


@router.post("/", response_model=RequestResponse)
async def create_request(req: RequestCreate, background_tasks: BackgroundTasks, current_user: User = Depends(get_current_user)):
    """
    Handle incoming user requests and start the agent workflow.
    """
    user_id = str(current_user.id)
    session_id = str(uuid.uuid4())
    
    # Synchronously write the session row to DB
    create_session(CreateSessionInput(
        user_id=user_id,
        raw_input=req.message,
        session_id=session_id
    ))
    
    # Start the orchestrator in the background
    background_tasks.add_task(run_orchestrator_task, req.message, user_id, session_id)
    
    return RequestResponse(session_id=session_id, status="started")


@router.get("/{session_id}")
async def get_request_status(session_id: str):
    """
    Get the status of a specific session, including HITL fields.
    """
    response = supabase.table("sessions").select("*").eq("id", session_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Session not found")
    return response.data[0]


class ApprovalRequest(BaseModel):
    approved: bool = True


@router.post("/{session_id}/approve")
async def approve_booking(
    session_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
):
    """
    Resume a paused HITL run with APPROVAL.
    The booking will proceed and followup notifications will be scheduled.
    """
    # Load the session
    response = supabase.table("sessions").select("*").eq("id", session_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Session not found")

    session = response.data[0]

    if session.get("hitl_status") != "pending_approval":
        raise HTTPException(
            status_code=409,
            detail=f"Session is not pending approval (current: {session.get('hitl_status')})"
        )

    if not session.get("hitl_state"):
        raise HTTPException(status_code=410, detail="Session state expired or missing")

    # Atomically claim this approval (prevent duplicate)
    update_resp = (
        supabase.table("sessions")
        .update({"hitl_status": "approved", "status": "running"})
        .eq("id", session_id)
        .eq("hitl_status", "pending_approval")
        .execute()
    )
    if not update_resp.data:
        raise HTTPException(status_code=409, detail="Approval already processed")

    # Resume in background
    background_tasks.add_task(
        _resume_and_cleanup,
        session_id,
        True,
        session["hitl_state"],
        str(current_user.id),
    )

    return {"status": "approved", "message": "Booking is being confirmed..."}


class RejectRequest(BaseModel):
    reason: str = "The user chose not to proceed with this booking."

@router.post("/{session_id}/reject")
async def reject_booking(
    session_id: str,
    payload: RejectRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
):
    """
    Resume a paused HITL run with REJECTION.
    The booking will be cancelled gracefully.
    """
    response = supabase.table("sessions").select("*").eq("id", session_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Session not found")

    session = response.data[0]

    if session.get("hitl_status") != "pending_approval":
        raise HTTPException(
            status_code=409,
            detail=f"Session is not pending approval (current: {session.get('hitl_status')})"
        )

    if not session.get("hitl_state"):
        raise HTTPException(status_code=410, detail="Session state expired or missing")

    # Atomically claim this rejection
    update_resp = (
        supabase.table("sessions")
        .update({"hitl_status": "rejected", "status": "running"})
        .eq("id", session_id)
        .eq("hitl_status", "pending_approval")
        .execute()
    )
    if not update_resp.data:
        raise HTTPException(status_code=409, detail="Decision already processed")

    # Resume in background
    background_tasks.add_task(
        _resume_and_cleanup,
        session_id,
        False,
        session["hitl_state"],
        str(current_user.id),
        payload.reason,
    )

    return {"status": "rejected", "message": "Booking has been cancelled."}


async def _resume_and_cleanup(
    session_id: str,
    approved: bool,
    state_payload: dict,
    user_id: str,
    rejection_message: str = "The user chose not to proceed with this booking.",
):
    """
    Runs resume_workflow in Phase 2, then clears or updates the HITL state in DB.
    """
    try:
        result = await resume_workflow(
            session_id=session_id,
            approved=approved,
            state_payload=state_payload,
            user_id=user_id,
            rejection_message=rejection_message,
        )
        if result["status"] == "pending_approval":
            # Session paused again (e.g. user rejected with feedback to search for someone else, and LLM found another candidate)
            supabase.table("sessions").update({
                "hitl_state": result["state_payload"],
                "hitl_status": "pending_approval",
                "provider_summary": result.get("provider_summary"),
                "status": "pending_approval",
            }).eq("id", session_id).execute()
            print(f"[HITL] Session {session_id} paused again for new booking approval.")
        else:
            # Done, either completed, cancelled, or failed
            supabase.table("sessions").update({
                "hitl_state": None,
            }).eq("id", session_id).execute()
            print(f"[HITL] Session {session_id} resumed → {result['status']}")

    except Exception as e:
        import traceback
        print(f"[HITL] Resume failed for session {session_id}: {e}")
        traceback.print_exc()
        # Mark session as failed
        supabase.table("sessions").update({
            "status": "failed",
            "hitl_state": None,
        }).eq("id", session_id).execute()
