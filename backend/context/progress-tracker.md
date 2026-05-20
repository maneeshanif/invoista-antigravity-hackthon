# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes.

## Current Phase

- Backend Core Setup

## Current Goal

- Connect backend API with frontend.

## Completed

- `context/feature-specs/01-project-intialization.md` (Project Initialization)
- `context/feature-specs/02-db-setup.md` (Database Setup Spec)
- Implement `Feature 01 - Initialize Project` (FastAPI backend with `uv`, basic config).
- Implement `Feature 02 - Database Setup` (Created Supabase schema and seed data migration).
- `context/feature-specs/03-mcp-server.md` (MCP Server Spec)
- Implement `Feature 03 - MCP Server` (`mcp_server/server.py`, `db.py`, and all 5 tools: `find_providers`, `rank_providers`, `create_booking`, `schedule_followups`, `write_trace_log`).
- `context/feature-specs/04-agent-orchestrator.md` (Agent Orchestrator Spec)
- Implement `Feature 04 - Agent Orchestrator` (Gemini-based workflow with MCP client and session management).
- `context/feature-specs/05-agent-refactor-openaisdk.md` (Agent Layer Refactor — OpenAI Agents SDK)
- Implement `Feature 05 - Agent Layer Refactor` (SDK-native multi-agent pipeline with Orchestrator + 4 specialist agents, stable SSE transport for MCP, and absolute .env path loading).
- `context/feature-specs/06-backend-routes.md` (Backend API Routes Spec)
- Implement `Feature 06 - Backend API Routes` (All 18 routes implemented, integrated with AgentOrchestrator).
- Implement `Feature 07 - Test Suite` (Comprehensive tests for API endpoints, AI agents, and MCP server tools using pytest).
- `context/feature-specs/08-hooks-implementation.md` (Hooks Implementation Spec)
- Implement `Feature 08 - Hooks Implementation` (TraceRunHooks and TraceAgentHooks implemented).
- `context/feature-specs/09-clerk-authentication-sync.md` (Clerk Authentication Sync Spec)
- `context/feature-specs/11-notification-agent.md` (Notification Agent Workflow Spec)
- Implement `Feature 11 - Notification Agent` (Specialist Notification Agent, database email fields migration SQL, SMTP integration, sequential orchestrator integration, trace hooks logging).
- Implement `Feature 12 - Arrival Timer Worker` (Background task for provider departure/arrival notifications and booking status updates).
- `context/feature-specs/13-post-booking-notification-fixes.md` (Post-Booking Webhook Notification & Follow-Up Fixes)
- Implement `Feature 09 - Clerk Authentication Sync` (JIT User Provisioning & JWT Validation via signature check or DB fallback).
- Implement `Feature 13 - Post-Booking Webhook Notification & Follow-Up Fixes` (Hoisted `supabase_client` import, validated `slot_id` to prevent placeholder fallbacks, and added comprehensive diagnostic logging for all 3 post-booking sequential actions: email confirmations, follow-up notifications scheduling, and arrival timer launching).
- Implement `Feature 14 - Vapi User/Session ID Resolution & Toast Notifications` (Decoupled Vapi tool payload parsing, implemented robust session & user ID extraction from Bearer JWT headers and custom variables, corrected DB-level association, and added premium Toast alert triggers with custom type-specific titles).
- Implement `Feature 14 Hardening - Vapi Webhook Tool Pipeline Hardening` (Extracted `_resolve_context` helper called once before tool loop; removed redundant `user_id` re-fetch inside `create_booking`; moved `write_trace_log` to after all post-booking steps with `emails_ok/followups_ok/timer_ok` outcome flags; introduced `AGENT_DISCOVERY`, `TOOL_FIND_PROVIDERS`, `AGENT_BOOKING`, `TOOL_CREATE_BOOKING` constants to prevent trace name drift).

## In Progress

- Connect backend API with frontend.

## Next Up

- Run `supabase/refresh_slots.sql` in Supabase SQL Editor to seed fresh demo slots.
- Test full orchestrator workflow end-to-end after slot refresh.
- Connect backend API with frontend.

## Open Questions

- Add unresolved product or implementation questions here.

## Architecture Decisions

- Extracted agent reasoning and tooling through MCP server to separate the agent runtime from API logic.
- Orchestrator Agent does NOT have `mcp_servers` — only its sub-agents (Discovery, Ranking, Booking, Followup) have direct MCP access. This prevents tool confusion where the Orchestrator could bypass sub-agents.
- Session lifecycle (create/update) and trace logging are handled in code + hooks, NOT by LLM tool calls. This avoids wasted LLM turns and duplicate DB records.

## Session Notes

- MCP server is at `mcp_server/server.py`. Run with `uv run python -m mcp_server.server` or `mcp dev mcp_server/server.py`.
- `SUPABASE_URL` must be set in `.env` for the DB client to initialise.
- All 5 tools are pure functions in `mcp_server/tools/`; tested ranking logic independently.
- Wrapped blocking Gemini `generate_content` call in `intent_agent.py` with `asyncio.to_thread` and `asyncio.wait_for` (10s timeout) to protect the event loop.
- Removed hardcoded demo fallback from `intent_agent.py`; implemented module-level logging and proper `None` return on failure.
- Updated `orchestrator.py` to gracefully handle failed intent extraction by failing the session instead of proceeding with fake data.
- Fixed invalid `asyncio.AsyncExitStack` reference in `mcp_client.py` by switching to `contextlib.AsyncExitStack`.
- **Fixed orchestrator workflow halt**: Root cause was 5-fold — (1) empty slots due to stale dates, (2) Orchestrator had both MCP + sub-agent tools (11 tools total), (3) duplicate session creation, (4) wasted turns on trace-log tool calls, (5) Gemini returning empty output. Fixed by removing MCP from Orchestrator, simplifying prompt to 4 steps, adding today's date to context, and creating `supabase/refresh_slots.sql`.
