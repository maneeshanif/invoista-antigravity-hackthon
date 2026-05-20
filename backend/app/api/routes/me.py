from fastapi import APIRouter, HTTPException, Depends
from typing import List
from app.db.schemas import User, Booking, Notification
from app.db.supabase import supabase
from app.api.dependencies import get_current_user

router = APIRouter()

@router.get("/", response_model=User)
async def get_my_profile(current_user: User = Depends(get_current_user)):
    """
    Get current user profile data.
    """
    # Get current user profile data
    response = supabase.table("users").select("*").eq("id", str(current_user.id)).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="User not found")

    return response.data[0]

@router.get("/bookings", response_model=List[Booking])
async def get_my_bookings(current_user: User = Depends(get_current_user)):
    """
    Get all bookings associated with the current user.
    """
    # Get all bookings associated with the current user.
    response = supabase.table("bookings").select("*, provider_slots(slot_date, slot_time)").eq("user_id", str(current_user.id)).execute()
    
    bookings = []
    for item in response.data:
        if "provider_slots" in item and item["provider_slots"]:
            item["slot_date"] = item["provider_slots"].get("slot_date")
            item["slot_time"] = item["provider_slots"].get("slot_time")
        bookings.append(item)
    return bookings

@router.get("/notifications", response_model=List[Notification])
async def get_my_notifications(current_user: User = Depends(get_current_user)):
    """
    Get all notifications for the current user.
    """
    # Assuming scheduled_at or sent_at, schema has scheduled_at
    response = supabase.table("notifications").select("*").eq("user_id", str(current_user.id)).order("scheduled_at", desc=True).execute()
    return response.data

@router.post("/notifications/{notification_id}/read")
async def read_notification(notification_id: str, current_user: User = Depends(get_current_user)):
    """
    Update the status of a specific notification to 'read'.
    """
    # Validate it belongs to user
    check = supabase.table("notifications").select("id").eq("id", notification_id).eq("user_id", str(current_user.id)).execute()
    if not check.data:
        raise HTTPException(status_code=404, detail="Notification not found")
        
    response = supabase.table("notifications").update({"status": "read"}).eq("id", notification_id).execute()
    return {"message": "Notification marked as read"}
