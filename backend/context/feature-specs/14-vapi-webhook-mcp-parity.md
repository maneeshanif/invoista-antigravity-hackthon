# Feature Spec 14 — Vapi Webhook Tool Pipeline Hardening

## Status: Agreed Direction — Option B (Targeted Fixes)

---

## 1. Context & Design Intent

The Vapi voice assistant and the chat assistant serve the same domain (find provider → book → notify) but are **deliberately different execution surfaces**:

| Surface | Who drives logic | Tools called |
|---|---|---|
| Chat (`orchestrator.py`) | OpenAI Agents SDK LLM orchestrator | MCP SSE: `find_providers_tool → rank_providers_tool → create_booking_tool → schedule_followups_tool → send_booking_emails_tool` |
| Voice (`vapi.py` webhook) | Vapi's assistant LLM (defined by `system-prompt.md`) | HTTP webhook: `find_providers`, `create_booking` |

**Ranking is intentionally absent from the Vapi tool list.** The Vapi system prompt defines exactly two tools and instructs the assistant LLM to "Focus on the top 1 or 2 matching professionals" by reading name and rating from the provider list. The Vapi LLM does the selection — no `rank_providers` call is needed or desired.

**HITL is intentionally absent.** Vapi's conversational confirmation ("Would you like me to book that slot for you?") is the equivalent human-in-the-loop gate. No SDK `needs_approval=True` interrupt is needed.

---

## 2. Execution Flow — As-Designed

### Chat Workflow (via Orchestrator)

```
HTTP POST /api/v1/chat/start
  └─► start_workflow(user_input, user_id, session_id)
        └─► MCPServerSse → Orchestrator LLM
              ├─► DiscoveryAgent    → MCP: find_providers_tool
              ├─► RankingAgent      → MCP: rank_providers_tool
              ├─► BookingAgent      → MCP: create_booking_tool        [HITL gate]
              ├─► FollowupAgent     → MCP: schedule_followups_tool
              └─► NotificationAgent → MCP: send_booking_emails_tool
```

### Vapi Voice Webhook (as-designed, direct Python calls)

```
POST /api/v1/vapi/webhook  (Vapi sends "tool-calls" event)
  └─► handle_vapi_webhook(request)
        ├─► [pre-handler] resolve session_id + user_id (JWT → Clerk ID → DB UUID → JIT provision)
        ├─► create_session(...)   ← idempotent, ensures session row exists
        │
        ├─► tool: "find_providers"
        │     find_providers(category, slot_date, area)   ← direct call
        │     write_trace_log(agent="DiscoveryAgent", tool="find_providers_tool")
        │     → return ranked provider list to Vapi LLM
        │       (Vapi LLM selects best option and asks user to confirm)
        │
        └─► tool: "create_booking"
              create_booking(provider_id, slot_id, user_id)
              write_trace_log(agent="BookingAgent", tool="create_booking_tool")
              ── post-booking pipeline ──────────────────────────────────────
              send_booking_emails(booking_id, user_id, provider_id)
                └─► SMTP: confirmation email to user + provider
              schedule_followups(booking_id, user_id, slot_date, slot_time)
                └─► DB notifications table: "reminder" (slot−1h), "completion_check" (slot+1h)
              asyncio.create_task(run_arrival_timer(booking_id, user_id))
                └─► +30s: notifications["provider_departed"] + bookings.status → in_progress
                └─► +60s: notifications["provider_arrived"]  + bookings.status → completed
```

The frontend polls `/api/v1/me/notifications` every 10 seconds (`useNotificationsPolling`). The `provider_departed` and `provider_arrived` rows written by the arrival timer will appear in the `/notifications` tab ~30s and ~60s after booking confirmation.

---

## 3. Gap Analysis — Current Webhook vs As-Designed

| Concern | As-Designed | Current State | Gap |
|---|---|---|---|
| `find_providers` tool called | ✓ | ✓ | — |
| `create_booking` tool called | ✓ | ✓ | — |
| Ranking | Vapi LLM handles (by design) | Not called (by design) | ✓ None |
| HITL | Vapi conversation (by design) | Not used (by design) | ✓ None |
| Trace: `find_providers` | `agent="DiscoveryAgent"`, `tool="find_providers_tool"` | Written inline, correct names | ~ Works but not extracted |
| Trace: `create_booking` | `agent="BookingAgent"`, `tool="create_booking_tool"` | Written **before** post-booking steps | ✗ Trace written before emails/followups fire |
| `send_booking_emails` | Fires after booking | ✓ Present | ✓ |
| `schedule_followups` | Fires after booking; uses slot_date + slot_time from DB | ✓ Present; fetches slot from DB | ✓ |
| Arrival timer worker | `asyncio.create_task(run_arrival_timer(...))` | ✓ Present | ✓ |
| Session creation | Once before tool dispatch | Inside per-tool loop (idempotent but runs on every tool call) | ✗ Runs redundantly |
| Session + user resolution | Once before dispatch loop | Inside per-tool loop (~80 lines repeated per call) | ✗ Structurally messy |
| `user_id` in `create_booking` | Use the already-resolved `user_id` | **Re-fetches from `sessions` table**, shadowing outer `user_id` | ✗ Redundant DB round-trip; potential None if session race |
| Trace step counter | Consistent across both tools in a session | Queried from DB fresh per tool call; can drift if concurrent calls | ~ Works in practice, fragile |

---

## 4. Bugs to Fix (Option B)

### Bug 1 — `create_booking` ignores pre-resolved `user_id`

Inside the `create_booking` block, the handler re-fetches `user_id` from the `sessions` table:

```python
# CURRENT (redundant re-fetch that can return None)
session_resp = supabase_client.table("sessions").select("user_id").eq("id", session_id).execute()
if session_resp.data:
    user_id = session_resp.data[0].get("user_id")
if not user_id:
    raise ValueError(f"Could not locate user_id for session {session_id}")
```

This ignores the `user_id` already resolved at the top of the loop. Fix: remove the re-fetch and use the outer `user_id` directly (it is already a valid UUID at this point, or execution would have been skipped).

### Bug 2 — Trace written before post-booking steps complete

The `write_trace_log` call for `create_booking` happens before `send_booking_emails`, `schedule_followups`, and `run_arrival_timer`. If those steps raise, the trace shows success for a partial execution.

Fix: move `write_trace_log` to after all post-booking steps, and include a `success` flag and summary that reflects the actual outcome of the pipeline.

### Bug 3 — Session/user resolution runs inside the per-tool loop

The `session_id` and `user_id` resolution blocks (~80 lines) re-run for every tool call in the `toolCalls` array. In practice Vapi sends one tool call per webhook event, but the structure is fragile and makes the code hard to follow.

Fix: extract into `async def _resolve_context(message, request) -> tuple[str, str | None]` called once before the loop.

---

## 5. Implementation Plan (Option B)

### 5.1 Extract `_resolve_context`

```python
async def _resolve_context(message: dict, request: Request) -> tuple[str, str | None]:
    """
    Returns (session_id, user_id).
    session_id: always a valid UUID (derived from call or generated).
    user_id: valid DB UUID, or None if resolution failed entirely.
    """
    # --- session_id resolution (same logic as current) ---
    # --- user_id resolution: JWT → Clerk ID → DB UUID → JIT provision ---
    # --- create_session() idempotently ---
    ...
```

Called once at the top of `handle_vapi_webhook`, before the `for tool_call in tool_calls` loop.

### 5.2 Fix `user_id` shadowing in `create_booking`

Remove the `session_resp` lookup block inside `create_booking`. Use `user_id` from `_resolve_context`. Add a guard at the start of the tool block:

```python
if not user_id:
    raise ValueError("user_id could not be resolved — cannot create booking")
```

### 5.3 Move trace write to after post-booking pipeline

```python
# Run all post-booking steps first
emails_ok = False
followups_ok = False
timer_ok = False

try:
    send_booking_emails(...)
    emails_ok = True
except Exception as e:
    print(f"[POST-BOOKING] email failed: {e}")

try:
    slot_resp = ...
    schedule_followups(...)
    followups_ok = True
except Exception as e:
    print(f"[POST-BOOKING] followups failed: {e}")

try:
    asyncio.create_task(run_arrival_timer(booking_id, user_id))
    timer_ok = True
except Exception as e:
    print(f"[POST-BOOKING] arrival timer failed: {e}")

# Write trace AFTER all steps
write_trace_log(WriteTraceLogInput(
    ...
    output_summary=f"Booking confirmed. emails={emails_ok} followups={followups_ok} timer={timer_ok}",
    output_payload={**booking_output.dict(), "emails_ok": emails_ok, "followups_ok": followups_ok},
    ...
))
```

### 5.4 Trace schema alignment

Ensure both tool handlers write traces using the same agent/tool name strings as the chat workflow:

| Tool | `agent_name` | `tool_used` |
|---|---|---|
| `find_providers` | `"DiscoveryAgent"` | `"find_providers_tool"` |
| `create_booking` | `"BookingAgent"` | `"create_booking_tool"` |

These names are already used in the current webhook but should be constants, not string literals, to prevent drift.

---

## 6. Notification Pipeline — Full Trace

After a successful `create_booking` call in the webhook, the full notification chain is:

```
Immediate (sync):
  send_booking_emails()
    ├─► SMTP email → user (subject: "Booking Confirmation")
    └─► SMTP email → provider (subject: "New Service Booking Received")

Immediate (sync DB insert, async dispatch):
  schedule_followups()
    ├─► notifications row: type="reminder",          scheduled_at = slot_time − 1h
    └─► notifications row: type="completion_check",  scheduled_at = slot_time + 1h
    (Celery worker dispatches these at the scheduled time)

Async background task (fire-and-forget):
  run_arrival_timer()
    ├─► +30s: notifications row: type="provider_departed" (status=sent)
    │         bookings.status → "in_progress"
    └─► +60s: notifications row: type="provider_arrived"  (status=sent)
              bookings.status → "completed"

Frontend poll (useNotificationsPolling, every 10s):
  GET /api/v1/me/notifications
    └─► /notifications tab updates with provider_departed (visible ~30s after booking)
                                   then provider_arrived  (visible ~60s after booking)
```

This matches the notification pipeline that runs in the chat workflow via `FollowupAgent` and `NotificationAgent`.

---

## 7. Out of Scope

- `rank_providers` — intentionally absent from Vapi tool spec; Vapi LLM selects from the raw list
- HITL — Vapi conversational confirmation is the equivalent gate
- MCP SSE transport for webhook — latency would exceed Vapi's 20s tool response timeout
- LLM fallback chain — no LLM runs in the webhook handler

---

## 8. Files Affected

| File | Change |
|---|---|
| `app/api/routes/vapi.py` | Extract `_resolve_context`; fix `user_id` shadowing; move trace write after post-booking steps; add per-step outcome flags |

No new files required. No changes to `ranking_tools.py`, `notification_tools.py`, `arrival_timer.py`, or Vapi dashboard config.

---

## 9. Acceptance Criteria

- [ ] A voice booking call produces 2 trace log rows in `trace_logs` (one per tool), with `agent_name` and `tool_used` matching the chat workflow convention
- [ ] The `provider_departed` notification appears in `/notifications` tab ~30s after booking
- [ ] The `provider_arrived` notification appears in `/notifications` tab ~60s after booking
- [ ] The confirmation email arrives in the user's inbox within seconds of booking
- [ ] `bookings.status` transitions: `confirmed → in_progress → completed`
- [ ] If `send_booking_emails` fails, the booking is NOT rolled back — the error is logged and the trace reflects `emails_ok=false`
- [ ] `user_id` resolution does not perform a redundant DB query inside the `create_booking` block
