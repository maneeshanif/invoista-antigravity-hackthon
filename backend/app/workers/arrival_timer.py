import asyncio
from datetime import datetime, timezone

from mcp_server.db import supabase_client


async def run_arrival_timer(booking_id: str, user_id: str):
    """
    Background task that simulates provider departure and arrival
    with time-delayed notification inserts and booking status updates.

    Timeline (from booking confirmation):
      +30s  → provider_departed notification + booking status → in_progress
      +60s  → provider_arrived notification  + booking status → completed
    """
    try:
        # Phase 1: Provider departs (30s after booking)
        await asyncio.sleep(30)

        supabase_client.table("notifications").insert({
            "booking_id": booking_id,
            "user_id": user_id,
            "type": "provider_departed",
            "message": "Your service provider has left and is on their way to you. ETA: ~30 minutes.",
            "scheduled_at": datetime.now(timezone.utc).isoformat(),
            "sent_at": datetime.now(timezone.utc).isoformat(),
            "status": "sent",
        }).execute()

        supabase_client.table("bookings").update({
            "status": "in_progress"
        }).eq("id", booking_id).execute()

        print(f"[ArrivalTimer] provider_departed for booking {booking_id}")

        # Phase 2: Provider arrives (30s after departure = 60s total)
        await asyncio.sleep(30)

        supabase_client.table("notifications").insert({
            "booking_id": booking_id,
            "user_id": user_id,
            "type": "provider_arrived",
            "message": "Your service provider has arrived! Please be ready to greet them.",
            "scheduled_at": datetime.now(timezone.utc).isoformat(),
            "sent_at": datetime.now(timezone.utc).isoformat(),
            "status": "sent",
        }).execute()

        supabase_client.table("bookings").update({
            "status": "completed"
        }).eq("id", booking_id).execute()

        print(f"[ArrivalTimer] provider_arrived for booking {booking_id}")

    except Exception as e:
        print(f"[ArrivalTimer] Error in arrival timer for booking {booking_id}: {e}")
