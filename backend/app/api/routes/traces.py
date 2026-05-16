from fastapi import APIRouter
from typing import List
from app.db.schemas import TraceLog
from app.db.supabase import supabase

router = APIRouter()

@router.get("/{session_id}/trace", response_model=List[TraceLog])
async def get_session_trace(session_id: str):
    """
    Fetch agent reasoning trace logs for a session.
    """
    response = supabase.table("trace_logs").select("*").eq("session_id", session_id).order("step").execute()
    return response.data

@router.get("/{session_id}/trace/export")
async def export_session_trace(session_id: str):
    """
    Export trace logs as JSON.
    """
    response = supabase.table("trace_logs").select("*").eq("session_id", session_id).order("step").execute()
    return {"session_id": session_id, "traces": response.data}
