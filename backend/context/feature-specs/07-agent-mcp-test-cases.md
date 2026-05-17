# Feature 07 - Agent MCP Test Cases

Test-case specification for validating the Feature 05 agent layer refactor to the OpenAI Agents SDK and MCP-backed tool workflow.

## Purpose

These tests prove that the refactored backend still behaves like the AI Service Marketplace pipeline:

User request -> Orchestrator intent reasoning -> Discovery Agent -> Ranking Agent -> Booking Agent -> Follow-up Agent -> trace-visible booking result.

The test suite should catch regressions in agent wiring, MCP tool registration, session/trace persistence, model fallback, and API behavior.

## Scope

In scope:

- OpenAI Agents SDK usage in `app/agents/`.
- Specialist agents exposed through `agent.as_tool()`.
- Shared MCP server connection used by the orchestrator and specialist agents.
- MCP tools registered by `mcp_server/server.py`.
- Session, trace, booking, ranking, provider, and notification behavior required by the agent flow.
- `/api/v1/requests` happy path and controlled failure behavior.

Out of scope:

- Frontend UI tests.
- Clerk auth enforcement.
- Real maps, payments, chat, or provider integrations.
- Celery delivery of notifications. Only notification row scheduling is tested.
- LLM quality beyond the explicit structured workflow contract.

## Implementation Notes

- The current implementation uses `MCPServerSse` and `MCP_SERVER_URL=http://localhost:8001/sse`.
- Feature 05 also mentions streamable HTTP at `/mcp`. Add a config-alignment test so the server transport, settings, Makefile/dev script, and agent client stay in sync.
- Most agent orchestration tests should mock SDK/LLM execution. Use live OpenAI/Gemini calls only for one optional smoke test.
- Database integration tests must reset known seed slots before booking tests and either clean up inserted rows or print inserted IDs for manual inspection.

## Shared Fixtures

Use the seed data from `backend/supabase/migrations/20260516000000_initial_schema.sql`.

```text
demo_user_id:      11111111-1111-1111-1111-111111111111
provider_ali:      22222222-2222-2222-2222-222222222221
provider_cool:     22222222-2222-2222-2222-222222222222
slot_ali_09:       33333333-3333-3333-3333-333333333331
slot_ali_1030:     33333333-3333-3333-3333-333333333332
slot_cool_0930:    33333333-3333-3333-3333-333333333333
demo_request:      Mujhe kal subah G-13 mein AC technician chahiye
default_user_lat:  33.6491
default_user_lng:  72.9818
```

## Recommended Test Files

- `backend/tests/test_agent_refactor_static.py`
- `backend/tests/test_mcp_server_registry.py`
- `backend/tests/test_agent_orchestrator_mcp.py`
- `backend/tests/test_request_api.py`
- Keep existing `backend/tests/test_mcp_tools.py` as the DB-backed tool integration suite, then extend it for the new session tools.

## Test Cases

### Static Refactor Checks

#### TC-07-A01 - SDK dependencies and obsolete files

Level: static/unit

Preconditions:
- Repository checkout includes Feature 05 refactor.

Steps:
1. Read `backend/pyproject.toml`.
2. Assert `openai-agents` is present.
3. Assert `google-generativeai` is absent.
4. Assert `backend/app/agents/intent_agent.py` does not exist.
5. Assert `backend/app/agents/mcp_client.py` does not exist.
6. Search `backend/app/agents/` for `IntentAgent`, `google.generativeai`, and custom `MCPClient` imports.

Expected:
- SDK dependency is installed.
- Obsolete hand-rolled agent/client files are gone.
- No agent code imports the removed Gemini SDK or custom MCP client.

#### TC-07-A02 - Specialist agent factories use SDK Agent and shared MCP

Level: unit

Preconditions:
- `create_discovery_agent`, `create_ranking_agent`, `create_booking_agent`, and `create_followup_agent` are importable.
- `get_model()` is monkeypatched to return a fake model object.
- A fake MCP server object is available.

Steps:
1. Call each specialist factory with the same fake MCP object.
2. Assert each returned object is an SDK `Agent`.
3. Assert each agent name is stable: `DiscoveryAgent`, `RankingAgent`, `BookingAgent`, `FollowupAgent`.
4. Assert each agent has exactly one MCP server and it is the same fake MCP object.
5. Assert each agent instruction comes from `prompts.py`.

Expected:
- All specialist agents are SDK-native and share the orchestrator-provided MCP connection.

#### TC-07-A03 - Orchestrator exposes specialist agents as tools

Level: unit with monkeypatching

Preconditions:
- Specialist factory functions and SDK `Agent` are monkeypatched with fakes that record calls.
- `Runner.run` is monkeypatched to return a fake result.

Steps:
1. Run `run_workflow(demo_request, demo_user_id)`.
2. Capture the orchestrator agent construction arguments.
3. Assert exactly four specialist tools are attached.
4. Assert tool names are exactly `run_discovery`, `run_ranking`, `run_booking`, and `run_followup`.
5. Assert the orchestrator also receives the shared MCP server in `mcp_servers`.

Expected:
- The orchestrator is the only user-facing agent.
- Each specialist is called through `.as_tool()` instead of direct Python calls.

#### TC-07-A04 - Orchestrator prompt preserves strict step order

Level: static/unit

Preconditions:
- `ORCHESTRATOR_PROMPT` is importable.

Steps:
1. Assert the prompt instructs intent extraction before tool calls.
2. Assert the prompt requires `create_session_tool` before specialist tools.
3. Assert the order is discovery, ranking, booking, follow-up, session status update.
4. Assert the prompt requires trace logging after each domain step.
5. Assert the prompt requires the final response in the same language as the user.

Expected:
- Prompt text protects the workflow from skipped, repeated, or out-of-order steps.

#### TC-07-A05 - MCP transport and URL alignment

Level: static/integration

Preconditions:
- `app/core/config.py`, `mcp_server/server.py`, `backend/Makefile`, and `backend/dev.ps1` are present.

Steps:
1. Read the default `MCP_SERVER_URL`.
2. Read the MCP server transport in `mcp_server/server.py`.
3. Read developer commands in `Makefile` and `dev.ps1`.
4. Assert all defaults point to the same port.
5. Assert the configured path matches the transport actually served by the MCP server.

Expected:
- The client and server agree on one transport contract.
- If the project chooses SSE, defaults should consistently use `/sse`.
- If the project migrates to streamable HTTP, defaults should consistently use `/mcp`.

#### TC-07-A06 - Model builders are centralized

Level: unit

Preconditions:
- Environment is monkeypatched per test.

Steps:
1. With `OPENAI_API_KEY` set, call `get_model()`.
2. Assert it builds `gpt-4o-mini` with an OpenAI client.
3. With `OPENAI_API_KEY` missing, assert `get_model()` raises a clear `ValueError`.
4. With `GEMINI_API_KEY` set, call `get_fallback_model()`.
5. Assert it builds the Gemini fallback model using `GEMINI_BASE_URL`.
6. Search specialist agent files for direct `AsyncOpenAI` construction.

Expected:
- Model construction stays in `llm_client.py`.
- Agent files do not duplicate provider setup or fallback logic.

### MCP Server and Tool Tests

#### TC-07-B01 - MCP server registers all agent workflow tools

Level: unit/integration

Preconditions:
- `mcp_server.server` is importable without starting the process.

Steps:
1. Inspect or query the FastMCP tool registry.
2. Assert the following tools are registered:
   - `find_providers_tool`
   - `rank_providers_tool`
   - `create_booking_tool`
   - `schedule_followups_tool`
   - `write_trace_log_tool`
   - `create_session_tool`
   - `update_session_status_tool`

Expected:
- All seven tools required by Feature 05 are discoverable by the Agents SDK over MCP.

#### TC-07-B02 - MCP server honors configured port

Level: integration

Preconditions:
- `MCP_PORT` can be set for the test process.

Steps:
1. Start the MCP server with `MCP_PORT=8011`.
2. Connect to the expected MCP URL for the selected transport.
3. List tools.

Expected:
- Server starts on the configured port.
- Tool discovery works on that port.
- No hardcoded port 8001 is required inside agent code.

#### TC-07-B03 - create_session_tool persists an in-progress session

Level: DB integration

Preconditions:
- Supabase env vars are set.
- Demo user exists.

Steps:
1. Call `create_session_tool` with `demo_user_id` and `demo_request`.
2. Query the `sessions` table for the returned ID.

Expected:
- A session row exists.
- `user_id` matches the input.
- `raw_input` matches the request.
- `status` is `in_progress`.
- `started_at` is populated.
- `completed_at` is null.

#### TC-07-B04 - update_session_status_tool completes a session

Level: DB integration

Preconditions:
- A session row exists from TC-07-B03.

Steps:
1. Call `update_session_status_tool` with `status="completed"` and `detected_language="roman_urdu"`.
2. Query the `sessions` table for the same session ID.

Expected:
- `status` is `completed`.
- `detected_language` is `roman_urdu`.
- `completed_at` is populated.

#### TC-07-B05 - find_providers_tool returns demo AC providers

Level: DB integration

Preconditions:
- Seed provider slots are reset to `is_booked=false`.

Steps:
1. Call `find_providers_tool` with `service_type="AC Technician"`, `area="G-13"`, and tomorrow's date.

Expected:
- `total_found >= 2`.
- Results include `Ali AC Repairs` and `Cool Tech Services`.
- Each returned provider includes at least the expected provider fields.
- Available slots exclude booked slots.

#### TC-07-B06 - rank_providers_tool applies the weighted formula

Level: unit

Preconditions:
- No database required.

Steps:
1. Pass two or more providers with different ratings, distances, and slot counts.
2. Use `default_user_lat` and `default_user_lng`.
3. Assert each sub-score is normalized to `[0, 1]`.
4. Assert `total_score = rating_score*0.40 + proximity_score*0.35 + availability_score*0.25`.
5. Assert results are sorted descending by `total_score`.

Expected:
- Ranking is deterministic and matches the architecture formula.

#### TC-07-B07 - create_booking_tool reserves a slot exactly once

Level: DB integration

Preconditions:
- `slot_ali_09` is reset to `is_booked=false`.

Steps:
1. Call `create_booking_tool` with the demo user, Ali provider, and `slot_ali_09`.
2. Query `bookings` and `provider_slots`.
3. Call `create_booking_tool` again with the same slot.

Expected:
- First call creates a `confirmed` booking.
- Confirmation code is non-empty and unique enough for the MVP.
- Slot is updated to `is_booked=true`.
- Second call fails with a controlled double-booking error.
- No second booking row is created for the same slot.

#### TC-07-B08 - schedule_followups_tool creates reminder and completion check

Level: DB integration

Preconditions:
- A confirmed booking exists.

Steps:
1. Call `schedule_followups_tool` with the booking ID, user ID, and booked slot datetime.
2. Query `notifications` for returned IDs.

Expected:
- Exactly two rows are created.
- Types are `reminder` and `completion_check`.
- Both rows have `status="pending"`.
- Reminder is scheduled one hour before the slot.
- Completion check is scheduled one hour after the slot.

#### TC-07-B09 - write_trace_log_tool stores full trace payload

Level: DB integration

Preconditions:
- A session row exists.

Steps:
1. Call `write_trace_log_tool` with a representative discovery step payload.
2. Query the `trace_logs` table for the returned trace ID.

Expected:
- Trace row contains the session ID, step number, agent name, tool name, input payload, output payload, output summary, and duration.
- JSON payloads round-trip without losing keys.
- Foreign key links the trace to the session.

### Orchestrator Workflow Tests

#### TC-07-C01 - Orchestrator sends the expected initial message

Level: unit with mocked Runner

Preconditions:
- `Runner.run` is monkeypatched.
- MCP context manager is faked.

Steps:
1. Call `run_workflow(demo_request, demo_user_id)`.
2. Capture the input passed to `Runner.run`.

Expected:
- Input includes `user_id`.
- Input includes `user_request`.
- Input asks the orchestrator to extract intent and process all steps in order.

#### TC-07-C02 - Happy-path orchestration sequence is observable

Level: integration with mocked LLM or trace log assertions

Preconditions:
- MCP server is available.
- Tool calls are instrumented or trace logs are queried after the run.

Steps:
1. Run the workflow for `demo_request`.
2. Capture tool calls or read trace logs for the created session.

Expected:
- Session is created before domain tool calls.
- Discovery runs before ranking.
- Ranking runs before booking.
- Booking runs before follow-up scheduling.
- Session status is updated after follow-up scheduling.
- No domain step is skipped or called twice.

#### TC-07-C03 - Downstream stages receive upstream outputs

Level: integration with mocked LLM/tool wrappers

Preconditions:
- Discovery, ranking, booking, and follow-up tools are wrapped with call recorders.

Steps:
1. Run the workflow with deterministic fake tool outputs.
2. Inspect each later tool's input.

Expected:
- Ranking receives the provider list returned by discovery.
- Booking receives the top ranked provider and one available slot.
- Follow-up receives the booking ID returned by booking.
- All trace writes include the same session ID.

#### TC-07-C04 - Missing providers stops before booking

Level: integration with mocked MCP tools

Preconditions:
- `find_providers_tool` is mocked to return no providers.

Steps:
1. Run the workflow for a service/area with no providers.
2. Capture tool calls and response.

Expected:
- Ranking, booking, and follow-up are not called.
- Session is marked `failed` or the API returns a controlled error.
- No booking or notification rows are inserted.
- A trace row records that provider discovery returned no matches.

#### TC-07-C05 - Double-booking failure does not schedule follow-ups

Level: integration with DB or mocked booking tool

Preconditions:
- Selected slot is already booked before the workflow reaches booking.

Steps:
1. Run the workflow where booking attempts to reserve the booked slot.
2. Capture later tool calls and database writes.

Expected:
- Booking fails with a controlled error.
- Follow-up scheduling is not called.
- Session is marked `failed`.
- Trace logs include the booking failure.

#### TC-07-C06 - Missing OpenAI key triggers Gemini fallback

Level: unit

Preconditions:
- `OPENAI_API_KEY` is absent.
- `GEMINI_API_KEY` is present.
- `Runner.run` is monkeypatched to return success for the fallback agent.

Steps:
1. Run `run_workflow(demo_request, demo_user_id)`.
2. Capture model builder calls and final response.

Expected:
- Primary model initialization fails with a clear `ValueError`.
- Fallback model is built once.
- Fallback orchestrator runs successfully.
- Response shape is still `{"status": "success", "summary": ...}`.

#### TC-07-C07 - OpenAI APIStatusError fallback is status-aware

Level: unit

Preconditions:
- `Runner.run` can be made to raise `APIStatusError`.

Steps:
1. Simulate OpenAI status codes `400`, `401`, `429`, `500`, and `503`.
2. Assert fallback is attempted.
3. Simulate a non-fallback status code.

Expected:
- Fallback is attempted only for intended transient/auth/quota statuses.
- Non-fallback errors propagate as controlled failures.

#### TC-07-C08 - Both model providers failing returns a controlled error

Level: unit/API

Preconditions:
- OpenAI and Gemini model creation or execution are both mocked to fail.

Steps:
1. Call `/api/v1/requests` with `demo_request`.

Expected:
- API returns HTTP 500 with a useful error detail.
- No session is incorrectly marked `completed`.
- No booking is created after orchestration failure.

### Request API and End-to-End Tests

#### TC-07-D01 - POST /api/v1/requests starts the agent workflow

Level: API integration with mocked workflow

Preconditions:
- FastAPI test client is available.
- `run_workflow` is monkeypatched.

Steps:
1. POST to `/api/v1/requests` with `user_id` and `user_request`.
2. Capture arguments passed to `run_workflow`.

Expected:
- API passes the request text as `user_input`.
- API passes the provided `user_id`.
- API returns the workflow result unchanged on success.

#### TC-07-D02 - POST /api/v1/requests supports default user_id

Level: API unit

Preconditions:
- `run_workflow` is monkeypatched.

Steps:
1. POST to `/api/v1/requests` with only `user_request`.
2. Capture the generated `user_id`.

Expected:
- Request validation succeeds.
- A UUID-like user ID is supplied to the workflow.
- Response contract is unchanged.

#### TC-07-D03 - Live demo smoke test

Level: manual or marked slow integration

Preconditions:
- Supabase env vars are set.
- `OPENAI_API_KEY` or `GEMINI_API_KEY` is set.
- MCP server is running.
- FastAPI app is running.
- Seed demo slots are unbooked.

Steps:
1. POST `demo_request` to `/api/v1/requests`.
2. Query `sessions`, `trace_logs`, `bookings`, and `notifications`.

Expected:
- HTTP response has `status="success"` and non-empty `summary`.
- One session is completed for the request.
- Trace logs exist for the domain steps: discovery, ranking, booking, and follow-up.
- A confirmed booking exists.
- Two pending notifications exist.
- Final summary is appropriate for the user's Roman Urdu request.

#### TC-07-D04 - Trace completeness contract

Level: DB integration

Preconditions:
- A successful workflow session exists.

Steps:
1. Query `trace_logs` ordered by `step` for the session.
2. Compare tools and agent names against the expected workflow.

Expected:
- Steps are strictly increasing.
- Required tools are represented:
   - `find_providers_tool`
   - `rank_providers_tool`
   - `create_booking_tool`
   - `schedule_followups_tool`
- Each trace has non-empty input payload, output payload, output summary, and duration.
- If the product requires five trace rows, add an explicit orchestrator intent/session trace and test for it.

## Acceptance Criteria

- Static tests prove the hand-rolled agent layer was removed.
- Unit tests prove each specialist agent is SDK-native and MCP-backed.
- MCP registry tests prove all seven required tools are discoverable.
- DB integration tests prove the tool layer can create sessions, bookings, notifications, and trace logs.
- Orchestrator tests prove specialist tools are called in order and data flows between stages.
- Fallback tests prove missing or failing OpenAI configuration does not break the workflow when Gemini is configured.
- API tests prove `/api/v1/requests` keeps a stable request and response contract.
- Live smoke test proves the demo request can complete end to end when external services are configured.
