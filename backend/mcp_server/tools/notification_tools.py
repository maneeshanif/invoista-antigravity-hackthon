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


class SendBookingEmailsInput(BaseModel):
    booking_id: str = Field(..., description="UUID of the booking to send notification emails for")
    user_id: str = Field(..., description="UUID of the user who booked the service")
    provider_id: str = Field(..., description="UUID of the service provider")


class SendBookingEmailsOutput(BaseModel):
    success: bool
    user_email_sent: bool
    provider_email_sent: bool
    details: str


def send_booking_emails(input: SendBookingEmailsInput) -> SendBookingEmailsOutput:
    """
    Fetches booking, slot, user, and provider details, then dispatches
    confirmation emails to both the user and provider via SMTP.
    """
    import os
    import smtplib
    import ssl
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart

    # 1. Fetch booking
    booking_resp = supabase_client.table("bookings").select("*").eq("id", input.booking_id).single().execute()
    booking = booking_resp.data
    if not booking:
        return SendBookingEmailsOutput(
            success=False,
            user_email_sent=False,
            provider_email_sent=False,
            details=f"Booking {input.booking_id} not found."
        )

    # 2. Fetch slot
    slot_resp = supabase_client.table("provider_slots").select("*").eq("id", booking["slot_id"]).single().execute()
    slot = slot_resp.data
    if not slot:
        return SendBookingEmailsOutput(
            success=False,
            user_email_sent=False,
            provider_email_sent=False,
            details=f"Slot {booking['slot_id']} not found."
        )

    # 3. Fetch user
    user_resp = supabase_client.table("users").select("*").eq("id", input.user_id).single().execute()
    user = user_resp.data
    if not user:
        return SendBookingEmailsOutput(
            success=False,
            user_email_sent=False,
            provider_email_sent=False,
            details=f"User {input.user_id} not found."
        )

    # 4. Fetch provider
    provider_resp = supabase_client.table("providers").select("*").eq("id", input.provider_id).single().execute()
    provider = provider_resp.data
    if not provider:
        return SendBookingEmailsOutput(
            success=False,
            user_email_sent=False,
            provider_email_sent=False,
            details=f"Provider {input.provider_id} not found."
        )

    user_email = user.get("email")
    provider_email = provider.get("email")

    if not user_email:
        print(f"⚠️ User {user['name']} has no email set.")
    if not provider_email:
        print(f"⚠️ Provider {provider['name']} has no email set.")

    # Email content details
    slot_date = slot["slot_date"]
    slot_time = slot["slot_time"]
    provider_name = provider["name"]

    user_subject = "Booking Confirmation"
    user_body = f"Your appointment with {provider_name} for the requested service is scheduled on {slot_date} at {slot_time}. Please be ready for that."

    provider_subject = "New Service Booking Received"
    provider_body = f"You got a new client. Please be ready to serve them on {slot_date} at {slot_time}."

    # SMTP configuration
    smtp_host = os.environ.get("SMTP_HOST", "smtp.gmail.com").strip()
    smtp_port = os.environ.get("SMTP_PORT", "465").strip()
    smtp_username = os.environ.get("SMTP_USERNAME", "").strip()
    smtp_password = os.environ.get("SMTP_PASSWORD", "").strip()

    user_email_sent = False
    provider_email_sent = False
    error_msgs = []

    # Helper function to send single email
    def dispatch_email(recipient_email: str, subject: str, body: str) -> bool:
        if not recipient_email:
            error_msgs.append("Missing recipient email address.")
            return False

        if not smtp_username or not smtp_password:
            # Running in mock mode
            print(f"[MOCK EMAIL SUCCESS] To: {recipient_email} | Subject: {subject} | Body: {body}")
            return True

        msg = MIMEMultipart()
        msg["From"] = smtp_username
        msg["To"] = recipient_email
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "plain"))

        try:
            port = int(smtp_port)
            if port == 465:
                context = ssl.create_default_context()
                with smtplib.SMTP_SSL(smtp_host, port, context=context) as server:
                    server.login(smtp_username, smtp_password)
                    server.sendmail(smtp_username, recipient_email, msg.as_string())
            else:
                with smtplib.SMTP(smtp_host, port) as server:
                    server.starttls()
                    server.login(smtp_username, smtp_password)
                    server.sendmail(smtp_username, recipient_email, msg.as_string())
            return True
        except Exception as e:
            err = f"SMTP error dispatching to {recipient_email}: {e}"
            print(err)
            error_msgs.append(err)
            raise e

    # Send both emails
    try:
        if user_email:
            user_email_sent = dispatch_email(user_email, user_subject, user_body)
        if provider_email:
            provider_email_sent = dispatch_email(provider_email, provider_subject, provider_body)
    except Exception as e:
        return SendBookingEmailsOutput(
            success=False,
            user_email_sent=user_email_sent,
            provider_email_sent=provider_email_sent,
            details=f"Failed to dispatch emails: {e}"
        )

    success = (user_email_sent or not user_email) and (provider_email_sent or not provider_email)
    details = "Emails sent successfully." if success else "; ".join(error_msgs)

    return SendBookingEmailsOutput(
        success=success,
        user_email_sent=user_email_sent,
        provider_email_sent=provider_email_sent,
        details=details
    )

