from fastapi import APIRouter, HTTPException
from typing import List
from app.db.schemas import User, Booking, Notification
from app.db.supabase import supabase

router = APIRouter()

@router.get("/", response_model=User)
async def get_my_profile():
    """
    Get current user profile data.
    """
    # For demo, using hardcoded user ID
    user_id = "11111111-1111-1111-1111-111111111111"
    
    response = supabase.table("users").select("*").eq("id", user_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="User not found")

    return response.data[0]

@router.get("/bookings", response_model=List[Booking])
async def get_my_bookings():
    """
    Get all bookings associated with the current user.
    """
    # For demo, using hardcoded user ID
    user_id = "11111111-1111-1111-1111-111111111111"
    
    response = supabase.table("bookings").select("*").eq("user_id", user_id).execute()
    return response.data

@router.get("/notifications", response_model=List[Notification])
async def get_my_notifications():
    """
    Get all notifications for the current user.
    """
    # For demo, using hardcoded user ID
    user_id = "11111111-1111-1111-1111-111111111111"
    
    # Assuming scheduled_at or sent_at, schema has scheduled_at
    response = supabase.table("notifications").select("*").eq("user_id", user_id).order("scheduled_at", desc=True).execute()
    return response.data

@router.post("/notifications/{notification_id}/read")
async def read_notification(notification_id: str):
    """
    Update the status of a specific notification to 'read'.
    """
    # For demo, using hardcoded user ID
    user_id = "11111111-1111-1111-1111-111111111111"
    
    # Validate it belongs to user
    check = supabase.table("notifications").select("id").eq("id", notification_id).eq("user_id", user_id).execute()
    if not check.data:
        raise HTTPException(status_code=404, detail="Notification not found")
        
    response = supabase.table("notifications").update({"status": "read"}).eq("id", notification_id).execute()
    return {"message": "Notification marked as read"}
