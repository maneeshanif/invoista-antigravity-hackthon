"""
booking_tools.py — MCP tool: create_booking

Creates a booking record linking user, provider, and slot. Generates a
human-readable confirmation code and marks the provider slot as booked.
"""

import random
import string
from datetime import datetime, timezone

from pydantic import BaseModel, Field

from mcp_server.db import supabase_client


class CreateBookingInput(BaseModel):
    user_id: str = Field(..., description="UUID of the user making the booking")
    provider_id: str = Field(..., description="UUID of the selected provider")
    slot_id: str = Field(..., description="UUID of the provider slot to reserve")


class CreateBookingOutput(BaseModel):
    booking_id: str
    confirmation_code: str
    status: str
    booked_at: str


def _generate_confirmation_code(length: int = 8) -> str:
    """Generates a short uppercase alphanumeric confirmation code."""
    chars = string.ascii_uppercase + string.digits
    return "".join(random.choices(chars, k=length))


def create_booking(input: CreateBookingInput) -> CreateBookingOutput:
    """
    Creates a booking record, marks the slot as booked, and returns a
    confirmation code.

    Steps:
    1. Check the slot is still available.
    2. Insert a BOOKINGS row with a generated confirmation code.
    3. Mark PROVIDER_SLOTS.is_booked = true.
    """
    # 1. Verify slot is still free
    slot_resp = (
        supabase_client.table("provider_slots")
        .select("id, is_booked")
        .eq("id", input.slot_id)
        .single()
        .execute()
    )
    slot = slot_resp.data
    if not slot:
        raise ValueError(f"Slot {input.slot_id} not found.")
    if slot["is_booked"]:
        raise ValueError(f"Slot {input.slot_id} is already booked.")

    confirmation_code = _generate_confirmation_code()
    booked_at = datetime.now(timezone.utc).isoformat()

    # 2. Create booking
    booking_resp = (
        supabase_client.table("bookings")
        .insert(
            {
                "user_id": input.user_id,
                "provider_id": input.provider_id,
                "slot_id": input.slot_id,
                "status": "confirmed",
                "confirmation_code": confirmation_code,
                "booked_at": booked_at,
            }
        )
        .execute()
    )
    booking = booking_resp.data[0]

    # 3. Mark slot as booked
    supabase_client.table("provider_slots").update({"is_booked": True}).eq(
        "id", input.slot_id
    ).execute()

    return CreateBookingOutput(
        booking_id=booking["id"],
        confirmation_code=confirmation_code,
        status=booking["status"],
        booked_at=booking["booked_at"],
    )
