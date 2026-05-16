from fastapi import APIRouter
from typing import List
from app.db.schemas import TraceLog, Session, Booking, Provider
from app.db.supabase import supabase

router = APIRouter()

@router.get("/traces", response_model=List[TraceLog])
async def list_all_traces():
    response = supabase.table("trace_logs").select("*").order("session_id").order("step").execute()
    return response.data

@router.get("/sessions", response_model=List[Session])
async def list_all_sessions():
    response = supabase.table("sessions").select("*").order("started_at", desc=True).execute()
    return response.data

@router.get("/bookings", response_model=List[Booking])
async def list_all_bookings():
    response = supabase.table("bookings").select("*").order("booked_at", desc=True).execute()
    return response.data

@router.get("/providers", response_model=List[Provider])
async def list_all_providers():
    response = supabase.table("providers").select("*").execute()
    return response.data
