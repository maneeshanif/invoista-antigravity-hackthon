"""
notification_tools.py — MCP tool: schedule_followups

Schedules reminder and completion-check notifications in the NOTIFICATIONS
table. These records are later picked up and dispatched by the Celery worker.
"""

from datetime import datetime, timedelta, timezone

from pydantic import BaseModel, Field

from mcp_server.db import supabase_client


class ScheduleFollowupsInput(BaseModel):
    booking_id: str = Field(..., description="UUID of the booking to schedule follow-ups for")
    user_id: str = Field(..., description="UUID of the user who placed the booking")
    slot_datetime: datetime = Field(
        ...,
        description="The exact datetime of the booked slot (UTC) used to compute reminder timing",
    )


class ScheduledNotification(BaseModel):
    notification_id: str
    type: str
    scheduled_at: str


class ScheduleFollowupsOutput(BaseModel):
    scheduled: list[ScheduledNotification]


def schedule_followups(input: ScheduleFollowupsInput) -> ScheduleFollowupsOutput:
    """
    Inserts two NOTIFICATIONS rows:
    - A *reminder* scheduled 1 hour before the slot.
    - A *completion_check* scheduled 1 hour after the slot.

    Celery workers poll the notifications table and send these at the appropriate time.
    """
    slot_dt = input.slot_datetime.replace(tzinfo=timezone.utc) if input.slot_datetime.tzinfo is None else input.slot_datetime

    notifications_to_insert = [
        {
            "booking_id": input.booking_id,
            "user_id": input.user_id,
            "type": "reminder",
            "message": "Reminder: Your service appointment is in 1 hour. Please be available.",
            "scheduled_at": (slot_dt - timedelta(hours=1)).isoformat(),
            "status": "pending",
        },
        {
            "booking_id": input.booking_id,
            "user_id": input.user_id,
            "type": "completion_check",
            "message": "Your service appointment time has passed. Was the service completed to your satisfaction?",
            "scheduled_at": (slot_dt + timedelta(hours=1)).isoformat(),
            "status": "pending",
        },
    ]

    resp = supabase_client.table("notifications").insert(notifications_to_insert).execute()

    scheduled = [
        ScheduledNotification(
            notification_id=row["id"],
            type=row["type"],
            scheduled_at=row["scheduled_at"],
        )
        for row in (resp.data or [])
    ]

    return ScheduleFollowupsOutput(scheduled=scheduled)
