# 13 — Post-Booking Webhook Notification & Follow-Up Fixes

## Overview

After a successful `create_booking` execution inside the Vapi webhook, three post‑booking actions should fire sequentially:

1. **Send confirmation emails** to the user and provider (`send_booking_emails`).
2. **Schedule follow‑up notifications** – a reminder 1 hour before the slot and a completion check 1 hour after (`schedule_followups`).
3. **Launch the arrival timer** background task (`run_arrival_timer`).

**Observed behaviour:** None of these steps execute during a live Vapi call. The booking itself succeeds and the webhook returns a valid result, but the post‑booking block is silently skipped.

---

## Root‑Cause Analysis

The post‑booking block lives in `backend/vapi.py` (around lines 312‑355). The current implementation relies on placeholder IDs (e.g., `"{{slot_id}}"` or a hard‑coded demo UUID) when querying Supabase. If these placeholders are not replaced with real IDs, the query returns no rows, causing the follow‑up logic to be skipped. Additionally, the import of `supabase_client` is performed inside multiple `try` blocks, which can leave the variable undefined when the post‑booking block runs.

### Key Issues
- **Placeholder IDs** – The code uses default/demo IDs instead of the actual `slot_id` received from the Vapi request.
- **Scoped `supabase_client` import** – The client may not be available when the post‑booking block runs.
- **Lack of success logging** – Failures are printed, but successful paths generate no output, making debugging difficult.

---

## Proposed Fixes

### 1️⃣ Hoist `supabase_client` Import

Import the Supabase client once at the top of the `create_booking` branch so it is always in scope:

```python
elif func_name == "create_booking":
    from mcp_server.db import supabase_client  # Single import
    provider_id = args.get("provider_id", "")
    slot_id = args.get("slot_id", "")
    # ... rest of the logic
```

### 2️⃣ Use Real `slot_id` from the Request

Remove any fallback to placeholder IDs. Validate that `slot_id` is a non‑empty UUID before querying:

```python
if not slot_id or "{{" in slot_id:
    raise ValueError("Invalid or missing slot_id received from Vapi webhook")
```

Then query Supabase with the genuine ID:

```python
slot_resp = (
    supabase_client.table("provider_slots")
    .select("slot_date, slot_time")
    .eq("id", slot_id)
    .execute()
)
```

### 3️⃣ Add Diagnostic Logging to All Steps

Insert explicit entry/exit logs so success and failure are visible:

```python
# 1️⃣ Send confirmation emails
try:
    print(f"[POST‑BOOKING 1/3] Sending confirmation emails for booking {booking_output.booking_id}")
    email_result = send_booking_emails(...)
    print(f"[POST‑BOOKING 1/3] Email result: {email_result}")
except Exception as e:
    print(f"[POST‑BOOKING 1/3] FAILED: {e}")

# 2️⃣ Schedule follow‑ups
try:
    print(f"[POST‑BOOKING 2/3] Scheduling follow‑ups for booking {booking_output.booking_id}")
    if slot_resp.data:
        print(f"[POST‑BOOKING 2/3] Slot data found: {slot_resp.data}")
        schedule_followups(...)
    else:
        print("[POST‑BOOKING 2/3] No slot data returned – skipping follow‑ups")
except Exception as e:
    print(f"[POST‑BOOKING 2/3] FAILED: {e}")

# 3️⃣ Arrival timer
try:
    print(f"[POST‑BOOKING 3/3] Launching arrival timer for booking {booking_output.booking_id}")
    from app.workers.arrival_timer import run_arrival_timer
    asyncio.create_task(run_arrival_timer(booking_id, user_id))
    print("[POST‑BOOKING 3/3] Arrival timer task created")
except Exception as e:
    print(f"[POST‑BOOKING 3/3] FAILED: {e}")
```

### 4️⃣ Ensure `arrival_timer` Module Exists

Create `backend/app/workers/arrival_timer.py` (see spec 12). The module should expose `async def run_arrival_timer(booking_id: str, user_id: str):` and handle provider departure/arrival notifications.

---

## Implementation Checklist
- [ ] Hoist `supabase_client` import to the top of the `create_booking` branch.
- [ ] Validate `slot_id` and raise an error for placeholders.
- [ ] Replace any hard‑coded demo IDs with the real `slot_id` from the request.
- [ ] Add comprehensive logging to each post‑booking step.
- [ ] Create the `arrival_timer` worker module.
- [ ] Run a live Vapi call and verify that all three steps log success and update the database accordingly.

---

## Definition of Success
- All three post‑booking steps execute and log success after every `create_booking` call.
- The `notifications` table receives reminder and completion‑check rows immediately after booking.
- Confirmation emails are dispatched (or mock‑logged if SMTP is unconfigured).
- The arrival timer fires and inserts `provider_departed` + `provider_arrived` notifications on schedule.
- No silent failures – each step either succeeds with a log or fails with a descriptive error.
