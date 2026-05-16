# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes.

## Current Phase

- Backend Core Setup

## Current Goal

- Setup MCP server tools.

## Completed

- Split architecture context into `project-overview.md`, `architecture-context.md`, `code-standards.md`, and `ai-workflow-rules.md`.
- `context/feature-specs/01-project-intialization.md` (Project Initialization)
- `context/feature-specs/02-db-setup.md` (Database Setup Spec)
- Implement `Feature 01 - Initialize Project` (FastAPI backend with `uv`, basic config).
- Implement `Feature 02 - Database Setup` (Created Supabase schema and seed data migration).
- `context/feature-specs/03-mcp-server.md` (MCP Server Spec)
- Implement `Feature 03 - MCP Server` (`mcp_server/server.py`, `db.py`, and all 5 tools: `find_providers`, `rank_providers`, `create_booking`, `schedule_followups`, `write_trace_log`).

## In Progress

- Connect Agent Orchestrator to MCP server tools.

## Next Up

- Connect agents to tools and database.

## Open Questions

- Add unresolved product or implementation questions here.

## Architecture Decisions

- Extracted agent reasoning and tooling through MCP server to separate the agent runtime from API logic.

## Session Notes

- MCP server is at `mcp_server/server.py`. Run with `uv run python -m mcp_server.server` or `mcp dev mcp_server/server.py`.
- `SUPABASE_URL` must be set in `.env` for the DB client to initialise.
- All 5 tools are pure functions in `mcp_server/tools/`; tested ranking logic independently.
