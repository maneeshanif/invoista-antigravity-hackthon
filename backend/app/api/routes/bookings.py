from fastapi import APIRouter, HTTPException, Depends
from app.db.schemas import Booking, BookingCreate, User
from app.api.dependencies import get_current_user
from app.db.supabase import supabase
import uuid
from datetime import datetime, timezone

router = APIRouter()

@router.post("/", response_model=Booking)
async def create_booking(booking_in: BookingCreate, current_user: User = Depends(get_current_user)):
    """
    Manually create a booking.
    """
    user_id = str(current_user.id)
    
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
    
    # Fetch booking with slot details
    full_response = supabase.table("bookings").select("*, provider_slots(slot_date, slot_time)").eq("id", booking_data["id"]).execute()
    if full_response.data:
        booking_dict = full_response.data[0]
        if "provider_slots" in booking_dict and booking_dict["provider_slots"]:
            booking_dict["slot_date"] = booking_dict["provider_slots"].get("slot_date")
            booking_dict["slot_time"] = booking_dict["provider_slots"].get("slot_time")
        return booking_dict
        
    return response.data[0]

@router.get("/{id}", response_model=Booking)
async def get_booking(id: str):
    """
    Get details for a specific booking.
    """
    response = supabase.table("bookings").select("*, provider_slots(slot_date, slot_time)").eq("id", id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    booking_dict = response.data[0]
    if "provider_slots" in booking_dict and booking_dict["provider_slots"]:
        booking_dict["slot_date"] = booking_dict["provider_slots"].get("slot_date")
        booking_dict["slot_time"] = booking_dict["provider_slots"].get("slot_time")
    return booking_dict

@router.post("/{id}/cancel", response_model=Booking)
async def cancel_booking(id: str):
    """
    Cancel a booking.
    """
    response = supabase.table("bookings").update({"status": "cancelled"}).eq("id", id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Free up the slot
    booking_data = response.data[0]
    supabase.table("provider_slots").update({"is_booked": False}).eq("id", booking_data["slot_id"]).execute()
    
    # Fetch booking with slot details
    full_response = supabase.table("bookings").select("*, provider_slots(slot_date, slot_time)").eq("id", id).execute()
    if full_response.data:
        booking_dict = full_response.data[0]
        if "provider_slots" in booking_dict and booking_dict["provider_slots"]:
            booking_dict["slot_date"] = booking_dict["provider_slots"].get("slot_date")
            booking_dict["slot_time"] = booking_dict["provider_slots"].get("slot_time")
        return booking_dict
        
    return booking_data
