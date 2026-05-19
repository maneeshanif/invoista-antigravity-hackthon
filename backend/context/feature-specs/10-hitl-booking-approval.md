# Feature 10 – Human-in-the-Loop (HITL) Booking Approval

Introduce a **pause-confirm-resume** flow between the Ranking Agent and the Booking Agent. After ranking completes, the orchestration halts, sends the top provider details to the user, and waits for an explicit **Confirm / Cancel** decision before the Booking Agent executes.

---

## 1. Problem

Currently, the pipeline runs fully automatically:

```
Discovery → Ranking → Booking → Followup
```

There is **no user confirmation step** before a real booking is created. Users have no opportunity to review the selected provider or cancel before the appointment is committed.

---

## 2. Solution — OpenAI Agents SDK Interruption Pattern

The [OpenAI Agents SDK HITL docs](https://openai.github.io/openai-agents-python/human_in_the_loop/) provide a native **pause → approve/reject → resume** mechanism via `RunState`.

### How It Works (SDK Primitives)

| Primitive | Role |
|---|---|
| `@function_tool(needs_approval=True)` | Marks a tool so the SDK pauses before executing it |
| `RunResult.interruptions` | List of pending `ToolApprovalItem` entries when a run pauses |
| `result.to_state()` | Serialises the paused run (conversation history + pending approval) |
| `RunState.from_json(agent, payload)` | Deserialises a stored state back into a resumable run |
| `state.approve(interruption)` | Records an approval decision on the pending tool call |
| `state.reject(interruption, rejection_message=...)` | Records a rejection with an optional message sent back into the run |
| `Runner.run(agent, state)` | Resumes the paused run from the stored state |

The interruption **surfaces on the outer run** — even when the tool belongs to a sub-agent reached via `Agent.as_tool()`. So the Orchestrator run is the one that pauses and resumes; no changes are needed to the inner BookingAgent.

---

## 3. New Workflow

```
Orchestrator
  ↓
  1. create_session_tool
  ↓
  2. run_discovery          (DiscoveryAgent)
  ↓
  3. run_ranking            (RankingAgent)
  ↓
  *** PAUSE — SDK interruption fires ***
  ↓
  4. [Frontend] Shows provider card:
       "We found Dr. Ahmed (AC Technician, ⭐ 4.8, 1.2 km away).
        Should we book? [Confirm] [Cancel]"
  ↓
  5. User taps Confirm  →  state.approve(interruption)
     User taps Cancel   →  state.reject(interruption, rejection_message="User cancelled the booking.")
  ↓
  6. Runner.run(orchestrator, state)   ← resume
  ↓
  7. run_booking            (BookingAgent) — executes only if approved
  ↓
  8. run_followup           (FollowupAgent)
  ↓
  9. update_session_status_tool("completed")
```

---

## 4. Backend Changes

### 4.1 Mark `run_booking` as Requiring Approval

In `orchestrator.py`, change the `.as_tool()` call for the booking agent:

```python
# BEFORE
booking_agent.as_tool(
    tool_name="run_booking",
    tool_description="Create a confirmed booking. Pass user_id, provider_id, slot_id.",
)

# AFTER
booking_agent.as_tool(
    tool_name="run_booking",
    tool_description=(
        "Create a confirmed booking for the top-ranked provider. "
        "Pass user_id, provider_id, and slot_id. "
        "Returns: booking_id, confirmation_code."
    ),
    needs_approval=True,   # ← SDK will pause before calling this
)
```

> **Why `Agent.as_tool(needs_approval=True)` and not `@function_tool(needs_approval=True)`?**
> The Booking Agent is a full SDK `Agent` wrapped via `.as_tool()`. The `needs_approval` parameter on `Agent.as_tool()` applies the interruption to the nested agent call itself — before the BookingAgent even runs. This is exactly what we want: pause before booking, not inside it.

### 4.2 Split `run_workflow` into Two Phases

Replace the single `run_workflow()` with two functions:

#### `start_workflow(user_input, user_id, session_id) → HITLPausePayload`

Runs orchestration up to and including the `run_booking` interruption.

```python
# app/agents/orchestrator.py

import json
from agents import Agent, Runner, RunConfig, RunState
from agents.mcp import MCPServerStreamableHttp
from app.core.config import settings

async def start_workflow(user_input: str, user_id: str, session_id: str) -> dict:
    """
    Phase 1: Run Discovery + Ranking.
    Pauses when run_booking fires its HITL interruption.
    Returns serialised RunState + provider summary for the frontend.
    """
    async with MCPServerStreamableHttp(
        params={"url": settings.MCP_SERVER_URL},
        cache_tools_list=True,
    ) as mcp:
        orchestrator = _build_orchestrator(mcp)

        initial_message = (
            f"user_id: {user_id}\n"
            f"session_id: {session_id}\n"
            f"user_request: {user_input}\n\n"
            "Understand the request, extract intent, then run discovery and ranking. "
            "When run_booking is triggered, let it pause for human approval."
        )

        result = await Runner.run(
            orchestrator,
            input=initial_message,
            run_config=RunConfig(tracing_disabled=True),
        )

        if result.interruptions:
            # Serialise the paused state to be stored in DB / cache
            state = result.to_state()
            state_payload = state.to_json()   # dict — safe to store in Supabase JSONB

            # Extract provider summary from the interruption arguments
            interruption = result.interruptions[0]
            provider_summary = _parse_provider_summary(interruption.arguments)

            return {
                "status": "pending_approval",
                "state_payload": state_payload,
                "interruption_id": interruption.call_id,
                "provider_summary": provider_summary,
            }

        # Unlikely — means booking ran without needing approval
        return {
            "status": "completed",
            "summary": result.final_output,
        }
```

#### `resume_workflow(session_id, approved: bool, user_id: str) → dict`

Loads the stored RunState, applies the decision, resumes orchestration.

```python
async def resume_workflow(
    session_id: str,
    approved: bool,
    state_payload: dict,
    user_id: str,
) -> dict:
    """
    Phase 2: Resume from stored RunState after user decision.
    If approved → BookingAgent runs → FollowupAgent runs.
    If rejected → sends cancellation message back into the run.
    """
    async with MCPServerStreamableHttp(
        params={"url": settings.MCP_SERVER_URL},
        cache_tools_list=True,
    ) as mcp:
        orchestrator = _build_orchestrator(mcp)

        # Reconstruct the paused run
        state = await RunState.from_json(orchestrator, state_payload)

        for interruption in state.interruptions:
            if approved:
                state.approve(interruption, always_approve=False)
            else:
                state.reject(
                    interruption,
                    rejection_message=(
                        "The user chose not to proceed. "
                        "Politely inform them the booking has been cancelled."
                    ),
                )

        result = await Runner.run(orchestrator, state)

        return {
            "status": "completed" if approved else "cancelled",
            "summary": result.final_output,
        }
```

#### Private Helper — Build Orchestrator

Extract a shared `_build_orchestrator(mcp)` so both phases use the **same agent definition** (required for `RunState.from_json` to deserialise correctly):

```python
def _build_orchestrator(mcp: MCPServerStreamableHttp) -> Agent:
    from app.agents.discovery_agent import create_discovery_agent
    from app.agents.ranking_agent import create_ranking_agent
    from app.agents.booking_agent import create_booking_agent
    from app.agents.followup_agent import create_followup_agent
    from app.agents.llm_client import get_model
    from app.agents.prompts import ORCHESTRATOR_PROMPT

    discovery_agent = create_discovery_agent(mcp)
    ranking_agent   = create_ranking_agent(mcp)
    booking_agent   = create_booking_agent(mcp)
    followup_agent  = create_followup_agent(mcp)

    tools = [
        discovery_agent.as_tool(
            tool_name="run_discovery",
            tool_description="Find available service providers. Pass service_type, area, slot_date.",
        ),
        ranking_agent.as_tool(
            tool_name="run_ranking",
            tool_description="Rank providers by rating, proximity, availability. Pass provider list.",
        ),
        booking_agent.as_tool(
            tool_name="run_booking",
            tool_description=(
                "Create a confirmed booking. Pass user_id, provider_id, slot_id."
            ),
            needs_approval=True,   # ← HITL gate
        ),
        followup_agent.as_tool(
            tool_name="run_followup",
            tool_description="Schedule reminder and completion-check notifications.",
        ),
    ]

    return Agent(
        name="Orchestrator",
        instructions=ORCHESTRATOR_PROMPT,
        model=get_model(),
        tools=tools,
        mcp_servers=[mcp],
    )
```

#### Provider Summary Parser

```python
def _parse_provider_summary(arguments: str | None) -> dict:
    """
    Extract human-readable provider details from the run_booking tool arguments.
    The arguments are a JSON string with at minimum: provider_id, slot_id, user_id.
    """
    import json
    try:
        args = json.loads(arguments or "{}")
    except json.JSONDecodeError:
        args = {}

    return {
        "provider_id":   args.get("provider_id", "unknown"),
        "slot_id":       args.get("slot_id", "unknown"),
        "raw_arguments": args,
    }
```

> **Note**: The Orchestrator prompt (Phase 2 below) should instruct the LLM to pass the full provider name and ranking score inside the `run_booking` tool call input, so the frontend can surface a richer card.

### 4.3 Update Orchestrator Prompt

Add a **PHASE 3 – BOOKING APPROVAL** section to `ORCHESTRATOR_PROMPT` in `prompts.py`:

```
PHASE 3 — AWAIT BOOKING APPROVAL (do NOT skip):
Before calling `run_booking`, the system will pause for human approval.
Include in your `run_booking` tool call input:
  - user_id
  - provider_id (top-ranked)
  - slot_id (first available)
  - provider_name    ← include for frontend display
  - provider_rating  ← include for frontend display
  - estimated_distance_km  ← include for frontend display

If the human rejects, acknowledge the cancellation and end the workflow gracefully.
```

---

## 5. New API Routes

Add two new endpoints in `app/api/routes/requests.py` (or a new `hitl.py` router):

### `POST /api/v1/requests/{session_id}/approve`

Resumes a paused run with **approval**.

```
Request Body: { "approved": true }
Response:     { "status": "completed", "summary": "..." }
```

### `POST /api/v1/requests/{session_id}/reject`

Resumes a paused run with **rejection**.

```
Request Body: { "approved": false }
Response:     { "status": "cancelled", "summary": "Booking cancelled." }
```

### State Storage

The serialised `RunState` (from `state.to_json()`) must be persisted between Phase 1 and Phase 2. Store it in the existing `sessions` table as a new JSONB column:

```sql
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS hitl_state JSONB DEFAULT NULL;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS hitl_status TEXT DEFAULT NULL;
-- hitl_status values: 'pending_approval' | 'approved' | 'rejected' | null
```

The API flow:

```
Phase 1 ends → store state.to_json() in sessions.hitl_state, set hitl_status='pending_approval'
Phase 2 starts → load sessions.hitl_state, deserialise, apply decision, resume
Phase 2 ends → clear sessions.hitl_state, set hitl_status='approved' or 'rejected'
```

---

## 6. Frontend Changes

### 6.1 Poll for HITL Status

The existing session polling in the frontend (`useApi.ts → getSession`) already tracks session status. Add `hitl_status` and `provider_summary` to the session response shape:

```typescript
// frontend/lib/useApi.ts — extend Session type
export interface HITLProviderSummary {
  provider_id: string;
  provider_name: string;
  provider_rating: number;
  estimated_distance_km: number;
  slot_id: string;
}

export interface Session {
  // ...existing fields...
  hitl_status: 'pending_approval' | 'approved' | 'rejected' | null;
  provider_summary: HITLProviderSummary | null;
}
```

### 6.2 Approval Card UI

When the polling detects `hitl_status === 'pending_approval'`, show a **provider approval card** in the request detail screen (`app/request/[id].tsx`):

```
┌─────────────────────────────────────────┐
│  ✅ Best Match Found!                    │
│                                         │
│  👤 Ahmed (AC Technician)               │
│  ⭐ 4.8  •  📍 1.2 km away             │
│  🕐 Tomorrow Morning                    │
│                                         │
│  [  Cancel  ]   [  Confirm Booking  ]   │
└─────────────────────────────────────────┘
```

### 6.3 Approve / Reject API Calls

Wire the buttons to the new backend endpoints:

```typescript
// frontend/lib/useApi.ts
approveBooking: async (sessionId: string) => {
  return apiCall(`/requests/${sessionId}/approve`, {
    method: 'POST',
    body: JSON.stringify({ approved: true }),
  });
},
rejectBooking: async (sessionId: string) => {
  return apiCall(`/requests/${sessionId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ approved: false }),
  });
},
```

---

## 7. Updated Data Flow (End to End)

```
POST /api/v1/requests  (user sends message)
  ↓
start_workflow(user_input, user_id, session_id)
  ↓
  Runner.run(orchestrator, initial_message)
    ↓ Discovery + Ranking complete
    ↓ run_booking fires → SDK pauses
  result.interruptions = [ToolApprovalItem]
  state = result.to_state()
  DB: sessions.hitl_state = state.to_json()
  DB: sessions.hitl_status = 'pending_approval'
  ↓
API Response: { status: "pending_approval", provider_summary: {...} }

  ← Frontend polls getSession → sees hitl_status='pending_approval'
  ← Frontend shows approval card

User taps [Confirm Booking]
  ↓
POST /api/v1/requests/{session_id}/approve
  ↓
resume_workflow(session_id, approved=True, state_payload, user_id)
  ↓
  state = RunState.from_json(orchestrator, stored_payload)
  state.approve(interruption)
  Runner.run(orchestrator, state)
    ↓ BookingAgent runs → booking created
    ↓ FollowupAgent runs → notifications scheduled
    ↓ update_session_status_tool("completed")
  ↓
API Response: { status: "completed", summary: "Booking confirmed! ..." }

  ← Frontend shows booking success view
```

---

## 8. Orchestrator Prompt Update (Full Diff)

In `app/agents/prompts.py`, add to `ORCHESTRATOR_PROMPT` between STEP 3 and STEP 4:

```diff
 STEP 3 — Call `run_ranking` with the full provider list from Step 2.
           Wait for the result. Identify the top-ranked provider.
           Then call `write_trace_log_tool` for this step.
 
+STEP 4 — Call `run_booking` with:
+          - user_id
+          - provider_id (top provider from Step 3)
+          - slot_id (first available slot from that provider)
+          - provider_name     (include for human review)
+          - provider_rating   (include for human review)
+          - estimated_distance_km  (include for human review)
+          The system will PAUSE here for the user to confirm or cancel.
+          If the user confirms, the booking will be created automatically.
+          If the user cancels, acknowledge gracefully:
+            "I've cancelled the booking. Let me know if you'd like to try again."
+          Then call `write_trace_log_tool` for this step.
 
-STEP 4 — Call `run_booking` with user_id, provider_id (top from Step 3), slot_id (first available).
-          Wait for the result. Get the booking_id and confirmation_code.
-          Then call `write_trace_log_tool` for this step.
 
 STEP 5 — Call `run_followup` with booking_id, user_id, and slot_datetime.
```

---

## 9. Security & Edge Cases

| Case | Handling |
|---|---|
| User abandons (no response) | `hitl_state` sits in DB. Add a TTL: cron job expires `pending_approval` sessions older than 30 minutes, marks them `rejected`. |
| Concurrent duplicate approvals | DB update `WHERE hitl_status = 'pending_approval'` is atomic; second request gets a 409 Conflict. |
| Run state version drift | Store SDK version with state. If SDK changes, route to a fallback that rejects and asks user to retry. |
| Approval after session expiry | Return 410 Gone. Frontend shows "Session expired, please start a new request." |
| Network failure mid-resume | `resume_workflow` is idempotent if called again with the same stored `hitl_state`. |

---

## 10. Check When Done

### Backend
- [x] `booking_agent.as_tool(..., needs_approval=True)` in `orchestrator.py`
- [x] `_build_orchestrator(mcp)` extracted as shared helper
- [x] `start_workflow()` returns `{ status: "pending_approval", state_payload, provider_summary }` on interruption
- [x] `resume_workflow()` loads `RunState.from_json`, applies `state.approve/reject`, resumes correctly
- [x] DB migration: `sessions.hitl_state JSONB`, `sessions.hitl_status TEXT`
- [x] `POST /api/v1/requests/{session_id}/approve` endpoint
- [x] `POST /api/v1/requests/{session_id}/reject` endpoint
- [x] Session GET response includes `hitl_status` and `provider_summary`
- [x] Orchestrator prompt updated with HITL-aware STEP 4 language
- [ ] TTL cleanup job / cron for abandoned `pending_approval` sessions

### Frontend
- [x] `Session` type in `useApi.ts` extended with `hitl_status` + `provider_summary`
- [x] `approveBooking(sessionId)` and `rejectBooking(sessionId)` API functions added
- [x] `app/request/[id].tsx` shows provider approval card when `hitl_status === 'pending_approval'`
- [x] Confirm button calls `approveBooking`, Cancel calls `rejectBooking`
- [x] After decision, UI transitions: Confirm → booking success view, Cancel → cancellation message
- [x] Polling continues after decision to reflect final session status

### End-to-End
- [ ] Full flow: message → discovery → ranking → **PAUSE** → user sees card → confirm → booking → followup → success
- [ ] Full flow: message → discovery → ranking → **PAUSE** → user taps cancel → graceful cancellation message
- [ ] `hitl_state` cleared from DB after resume completes
