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
    slot_date: str = Field(..., description="Date of the slot (YYYY-MM-DD)")
    slot_time: str = Field(..., description="Time of the slot (e.g. '09:00 AM')")


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
    # Parse date and time strings into a single datetime
    # Expected format: slot_date="2026-05-18", slot_time="09:00 AM"
    try:
        slot_dt = datetime.strptime(f"{input.slot_date} {input.slot_time}", "%Y-%m-%d %I:%M %p")
        slot_dt = slot_dt.replace(tzinfo=timezone.utc)
    except ValueError:
        # Fallback if time format is weird
        from datetime import date
        d = date.fromisoformat(input.slot_date)
        slot_dt = datetime(d.year, d.month, d.day, 12, 0, tzinfo=timezone.utc)

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
