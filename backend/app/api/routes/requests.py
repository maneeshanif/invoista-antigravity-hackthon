
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.agents.orchestrator import run_workflow
import uuid

router = APIRouter()

class RequestInput(BaseModel):
    user_id: str = str(uuid.uuid4())
    user_request: str

@router.post("/requests")
async def create_request(input_data: RequestInput):
    """
    Endpoint to trigger the full agent orchestration workflow.
    """
    try:
        result = await run_workflow(
            user_input=input_data.user_request,
            user_id=input_data.user_id
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from fastapi import BackgroundTasks
from typing import Optional


from app.db.schemas import RequestCreate, RequestResponse, Session
from app.db.supabase import supabase
from app.agents.orchestrator import AgentOrchestrator

router = APIRouter()

async def run_orchestrator_task(session_id: str, message: str, user_id: Optional[str]):
    orchestrator = AgentOrchestrator(session_id=session_id, user_id=user_id)
    await orchestrator.run_workflow(message)

@router.post("/", response_model=RequestResponse)
async def create_request(req: RequestCreate, background_tasks: BackgroundTasks):
    """
    Handle incoming user requests and start the agent workflow.
    """
    # For demo, we might not have a real user_id yet, or it might be passed from Clerk
    user_id = req.user_id or "11111111-1111-1111-1111-111111111111" # Default demo user
    
    # We generate a session_id here so we can return it immediately
    session_id = str(uuid.uuid4())
    
    # Start the orchestrator in the background
    background_tasks.add_task(run_orchestrator_task, session_id, req.message, user_id)
    
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
