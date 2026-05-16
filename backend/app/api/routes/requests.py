from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import Optional
import uuid

from app.db.schemas import RequestCreate, RequestResponse, Session
from app.db.supabase import supabase
from app.agents.orchestrator import run_workflow

router = APIRouter()

async def run_orchestrator_task(user_input: str, user_id: str):
    try:
        await run_workflow(user_input, user_id)
    except Exception as e:
        print(f"Orchestrator task failed: {e}")

@router.post("/", response_model=RequestResponse)
async def create_request(req: RequestCreate, background_tasks: BackgroundTasks):
    """
    Handle incoming user requests and start the agent workflow.
    """
    user_id = req.user_id or "11111111-1111-1111-1111-111111111111"
    session_id = str(uuid.uuid4())
    
    # Start the orchestrator in the background
    background_tasks.add_task(run_orchestrator_task, req.message, user_id)
    
    return RequestResponse(session_id=session_id, status="started")

@router.get("/{session_id}", response_model=Session)
async def get_request_status(session_id: str):
    """
    Get the status of a specific session.
    """
    response = supabase.table("sessions").select("*").eq("id", session_id).single().execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Session not found")
    return response.data
