from fastapi import APIRouter, HTTPException
from app.db.schemas import FollowupTrigger
from app.db.supabase import supabase
import uuid
from datetime import datetime, timezone

router = APIRouter()

@router.post("/trigger")
async def trigger_followup(trigger: FollowupTrigger):
    """
    Manually trigger a follow-up for demo purposes.
    """
    # Fetch the booking to get user details
    booking_res = supabase.table("bookings").select("*").eq("id", str(trigger.booking_id)).single().execute()
    if not booking_res.data:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    booking = booking_res.data
    
    # Create a notification record
    notification_data = {
        "id": str(uuid.uuid4()),
        "booking_id": booking["id"],
        "user_id": booking["user_id"],
        "type": "followup",
        "message": "Hi! How was your service with the provider? Please let us know if everything went well.",
        "scheduled_at": datetime.now(timezone.utc).isoformat(),
        "sent_at": datetime.now(timezone.utc).isoformat(),
        "status": "sent"
    }
    
    response = supabase.table("notifications").insert(notification_data).execute()
    return {"status": "success", "notification": response.data[0]}
