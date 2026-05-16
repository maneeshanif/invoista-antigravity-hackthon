from fastapi import APIRouter, HTTPException
from app.db.schemas import Booking, BookingCreate
from app.db.supabase import supabase
import uuid
from datetime import datetime, timezone

router = APIRouter()

@router.post("/", response_model=Booking)
async def create_booking(booking_in: BookingCreate):
    """
    Manually create a booking.
    """
    # In a real app, user_id would come from auth
    user_id = "11111111-1111-1111-1111-111111111111"
    
    booking_data = {
        "id": str(uuid.uuid4()),
        "provider_id": str(booking_in.provider_id),
        "user_id": user_id,
        "slot_id": str(booking_in.slot_id),
        "status": "confirmed",
        "confirmation_code": f"CONF-{uuid.uuid4().hex[:6].upper()}",
        "booked_at": datetime.now(timezone.utc).isoformat()
    }
    
    response = supabase.table("bookings").insert(booking_data).execute()
    if not response.data:
        raise HTTPException(status_code=400, detail="Failed to create booking")
    
    # Also update the slot to is_booked=True
    supabase.table("provider_slots").update({"is_booked": True}).eq("id", str(booking_in.slot_id)).execute()
    
    return response.data[0]

@router.get("/{id}", response_model=Booking)
async def get_booking(id: str):
    """
    Get details for a specific booking.
    """
    response = supabase.table("bookings").select("*").eq("id", id).single().execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Booking not found")
    return response.data

@router.post("/{id}/cancel", response_model=Booking)
async def cancel_booking(id: str):
    """
    Cancel a booking.
    """
    response = supabase.table("bookings").update({"status": "cancelled"}).eq("id", id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Free up the slot
    booking = response.data[0]
    supabase.table("provider_slots").update({"is_booked": False}).eq("id", booking["slot_id"]).execute()
    
    return booking
