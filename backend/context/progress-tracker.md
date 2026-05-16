# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes.

## Current Phase

- Backend Core Setup

## Current Goal

- Implement Feature 06 - Backend API Routes.

## Completed

- Split architecture context into `project-overview.md`, `architecture-context.md`, `code-standards.md`, and `ai-workflow-rules.md`.
- `context/feature-specs/01-project-intialization.md` (Project Initialization)
- `context/feature-specs/02-db-setup.md` (Database Setup Spec)
- Implement `Feature 01 - Initialize Project` (FastAPI backend with `uv`, basic config).
- Implement `Feature 02 - Database Setup` (Created Supabase schema and seed data migration).
- `context/feature-specs/03-mcp-server.md` (MCP Server Spec)
- Implement `Feature 03 - MCP Server` (`mcp_server/server.py`, `db.py`, and all 5 tools: `find_providers`, `rank_providers`, `create_booking`, `schedule_followups`, `write_trace_log`).
- `context/feature-specs/04-agent-orchestrator.md` (Agent Orchestrator Spec)
- Implement `Feature 04 - Agent Orchestrator` (Gemini-based workflow with MCP client and session management).
<<<<<<< HEAD
- `context/feature-specs/05-agent-refactor-openaisdk.md` (Agent Layer Refactor — OpenAI Agents SDK)
- Implement `Feature 05 - Agent Layer Refactor` (SDK-native multi-agent pipeline with Orchestrator + 4 specialist agents, stable SSE transport for MCP, and absolute .env path loading).

## In Progress

- Connect agents to tools and database.
=======
- `context/feature-specs/06-backend-routes.md` (Backend API Routes Spec)
- Implement `Feature 06 - Backend API Routes` (All 18 routes implemented, integrated with AgentOrchestrator).

## In Progress

- Connect backend API with frontend.
>>>>>>> 21dc849 (Add backend routes for admin, bookings, foolowups, me, providers, requests, traces)

## Next Up

- Connect backend API with frontend.

## Open Questions

- Add unresolved product or implementation questions here.

## Architecture Decisions

- Extracted agent reasoning and tooling through MCP server to separate the agent runtime from API logic.

## Session Notes

- MCP server is at `mcp_server/server.py`. Run with `uv run python -m mcp_server.server` or `mcp dev mcp_server/server.py`.
- `SUPABASE_URL` must be set in `.env` for the DB client to initialise.
- All 5 tools are pure functions in `mcp_server/tools/`; tested ranking logic independently.
- Wrapped blocking Gemini `generate_content` call in `intent_agent.py` with `asyncio.to_thread` and `asyncio.wait_for` (10s timeout) to protect the event loop.
- Removed hardcoded demo fallback from `intent_agent.py`; implemented module-level logging and proper `None` return on failure.
- Updated `orchestrator.py` to gracefully handle failed intent extraction by failing the session instead of proceeding with fake data.
- Fixed invalid `asyncio.AsyncExitStack` reference in `mcp_client.py` by switching to `contextlib.AsyncExitStack`.
