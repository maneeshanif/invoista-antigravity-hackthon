from fastapi import APIRouter, HTTPException, Depends
from typing import List
from pydantic import BaseModel
from app.db.schemas import Notification, User
from app.api.dependencies import get_current_user
from app.db.supabase import supabase

router = APIRouter()


@router.get("/", response_model=List[Notification])
async def get_notifications(current_user: User = Depends(get_current_user)):
    """
    Get all notifications for the current user, newest first.
    """
    response = (
        supabase.table("notifications")
        .select("*")
        .eq("user_id", str(current_user.id))
        .order("scheduled_at", desc=True)
        .execute()
    )
    return response.data or []


@router.post("/{notification_id}/read")
async def read_notification(
    notification_id: str,
    current_user: User = Depends(get_current_user),
):
    """
    Mark a notification as read. Only the owning user may do this.
    """
    check = (
        supabase.table("notifications")
        .select("id")
        .eq("id", notification_id)
        .eq("user_id", str(current_user.id))
        .execute()
    )
    if not check.data:
        raise HTTPException(status_code=404, detail="Notification not found")

    supabase.table("notifications").update({"status": "read"}).eq("id", notification_id).execute()
    return {"message": "Notification marked as read"}


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: str,
    current_user: User = Depends(get_current_user),
):
    """
    Delete a single notification. Only the owning user may delete it.
    """
    check = (
        supabase.table("notifications")
        .select("id")
        .eq("id", notification_id)
        .eq("user_id", str(current_user.id))
        .execute()
    )
    if not check.data:
        raise HTTPException(status_code=404, detail="Notification not found")

    supabase.table("notifications").delete().eq("id", notification_id).execute()
    return {"message": "Notification deleted"}


class BulkDeleteRequest(BaseModel):
    notification_ids: List[str]


@router.post("/bulk-delete")
async def bulk_delete_notifications(
    body: BulkDeleteRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Delete multiple notifications at once. Only deletes notifications that
    belong to the current user.
    """
    if not body.notification_ids:
        raise HTTPException(status_code=400, detail="notification_ids must not be empty")

    user_id = str(current_user.id)

    # Verify which IDs actually belong to this user before deleting
    check = (
        supabase.table("notifications")
        .select("id")
        .in_("id", body.notification_ids)
        .eq("user_id", user_id)
        .execute()
    )
    eligible_ids = [row["id"] for row in (check.data or [])]
    if not eligible_ids:
        raise HTTPException(status_code=404, detail="No matching notifications found")

    supabase.table("notifications").delete().in_("id", eligible_ids).execute()
    return {"deleted": len(eligible_ids), "notification_ids": eligible_ids}
