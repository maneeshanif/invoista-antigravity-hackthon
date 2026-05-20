from fastapi import APIRouter, HTTPException, Depends
from typing import List
from pydantic import BaseModel
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
async def cancel_booking(id: str, current_user: User = Depends(get_current_user)):
    """
    Cancel a booking. Only the owning user may cancel their own booking.
    """
    # Verify ownership
    check = (
        supabase.table("bookings")
        .select("id, slot_id, status")
        .eq("id", id)
        .eq("user_id", str(current_user.id))
        .execute()
    )
    if not check.data:
        raise HTTPException(status_code=404, detail="Booking not found")
    if check.data[0]["status"] == "cancelled":
        raise HTTPException(status_code=400, detail="Booking is already cancelled")

    response = supabase.table("bookings").update({"status": "cancelled"}).eq("id", id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Free up the slot
    booking_data = check.data[0]
    supabase.table("provider_slots").update({"is_booked": False}).eq("id", booking_data["slot_id"]).execute()
    
    # Fetch booking with slot details
    full_response = supabase.table("bookings").select("*, provider_slots(slot_date, slot_time)").eq("id", id).execute()
    if full_response.data:
        booking_dict = full_response.data[0]
        if "provider_slots" in booking_dict and booking_dict["provider_slots"]:
            booking_dict["slot_date"] = booking_dict["provider_slots"].get("slot_date")
            booking_dict["slot_time"] = booking_dict["provider_slots"].get("slot_time")
        return booking_dict
        
    return response.data[0]


class BulkCancelRequest(BaseModel):
    booking_ids: List[str]


@router.post("/bulk-cancel")
async def bulk_cancel_bookings(
    body: BulkCancelRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Cancel multiple bookings at once. Only cancels bookings that belong to the
    current user and are still in 'confirmed' status.
    """
    if not body.booking_ids:
        raise HTTPException(status_code=400, detail="booking_ids must not be empty")

    user_id = str(current_user.id)

    # Fetch confirmed bookings that belong to this user
    check = (
        supabase.table("bookings")
        .select("id, slot_id")
        .in_("id", body.booking_ids)
        .eq("user_id", user_id)
        .eq("status", "confirmed")
        .execute()
    )
    eligible = check.data or []
    if not eligible:
        raise HTTPException(status_code=404, detail="No eligible bookings found to cancel")

    eligible_ids = [b["id"] for b in eligible]
    slot_ids = [b["slot_id"] for b in eligible]

    # Cancel all eligible bookings
    supabase.table("bookings").update({"status": "cancelled"}).in_("id", eligible_ids).execute()

    # Free up the associated slots
    for slot_id in slot_ids:
        supabase.table("provider_slots").update({"is_booked": False}).eq("id", slot_id).execute()

    return {"cancelled": len(eligible_ids), "booking_ids": eligible_ids}

