"""
refresh_slots.py — Seed fresh provider slots for the next 3 days.

Run: uv run python scripts/refresh_slots.py

Uses the Supabase client to:
1. Delete all unbooked provider_slots
2. Insert 5 time slots × 3 days for every active provider
"""

import sys
import os
from datetime import date, timedelta

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from mcp_server.db import supabase_client


SLOT_TIMES = ["09:00 AM", "10:30 AM", "12:00 PM", "02:00 PM", "04:00 PM"]
DAYS_AHEAD = 3


def refresh_slots():
    # 1. Delete existing unbooked slots
    print("Deleting existing unbooked slots...")
    supabase_client.table("provider_slots").delete().eq("is_booked", False).execute()
    print("✅ Unbooked slots cleared.")

    # 2. Get all active providers
    providers_resp = supabase_client.table("providers").select("id, name").eq("is_active", True).execute()
    providers = providers_resp.data or []
    print(f"Found {len(providers)} active providers.")

    # 3. Generate slots for next 3 days
    today = date.today()
    slots_to_insert = []
    for provider in providers:
        for day_offset in range(DAYS_AHEAD):
            slot_date = (today + timedelta(days=day_offset)).isoformat()
            for slot_time in SLOT_TIMES:
                slots_to_insert.append({
                    "provider_id": provider["id"],
                    "slot_date": slot_date,
                    "slot_time": slot_time,
                    "is_booked": False,
                })

    # 4. Insert in batches (Supabase has payload limits)
    batch_size = 100
    total_inserted = 0
    for i in range(0, len(slots_to_insert), batch_size):
        batch = slots_to_insert[i:i + batch_size]
        try:
            supabase_client.table("provider_slots").upsert(
                batch,
                on_conflict="provider_id,slot_date,slot_time"
            ).execute()
            total_inserted += len(batch)
        except Exception as e:
            print(f"⚠️  Batch {i // batch_size + 1} error: {e}")

    print(f"✅ Inserted {total_inserted} slots for {len(providers)} providers across {DAYS_AHEAD} days.")
    print(f"   Dates: {today.isoformat()} → {(today + timedelta(days=DAYS_AHEAD - 1)).isoformat()}")
    print(f"   Times: {', '.join(SLOT_TIMES)}")


if __name__ == "__main__":
    refresh_slots()
