from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import Optional
import uuid

from app.db.schemas import RequestCreate, RequestResponse, Session, User
from app.db.supabase import supabase
from app.agents.orchestrator import run_workflow
from fastapi import Depends
from app.api.dependencies import get_current_user

from mcp_server.tools.trace_tools import create_session, CreateSessionInput

router = APIRouter()

async def run_orchestrator_task(user_input: str, user_id: str, session_id: str):
    try:
        await run_workflow(user_input, user_id, session_id)
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

@router.get("/{session_id}", response_model=Session)
async def get_request_status(session_id: str):
    """
    Get the status of a specific session.
    """
    response = supabase.table("sessions").select("*").eq("id", session_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Session not found")
    return response.data[0]
