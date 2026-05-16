# MCP Server Specification

## Description

Set up the MCP (Model Context Protocol) Server for the Agent tool layer. The MCP server acts as the central interface that exposes necessary tools to the Agent Orchestrator to execute discrete domain tasks. This ensures the Agent Runtime does not directly call backend functions, promoting modularity and adherence to the architecture.

## Design

The MCP server will expose a specific set of tools required for the AI Service Marketplace workflow. These tools will interact with the Supabase Postgres database. 

The tools that the server will include are:
- `find_providers`: Queries the database to find matching providers and their available slots based on the extracted intent.
- `rank_providers`: Ranks the discovered providers using the architecture formula: `(rating_score * 0.40) + (proximity_score * 0.35) + (availability_score * 0.25)`.
- `create_booking`: Creates a booking record linking the user, provider, and slot, and generates a confirmation code. Marks the slot as booked.
- `schedule_followups`: Schedules reminder and completion check notifications in the database to be processed later by Celery.
- `write_trace_log`: Saves agent reasoning, tool inputs/outputs, and duration for full transparency on the admin dashboard.

*(Note: Intent extraction is handled directly by the intent extracting agent's LLM, so no MCP tool is required for it).*

## Implementation

Create the MCP server in the backend directory utilizing the specified folder structure.

Folder Structure:
```text
backend/mcp_server/
  server.py
  db.py
  tools/
    provider_tools.py
    ranking_tools.py
    booking_tools.py
    notification_tools.py
    trace_tools.py
```

- `server.py`: The entry point that initializes the `FastMCP` Server and registers all tools.
- `db.py`: Initializes the Supabase database client to facilitate DB operations across tools.
- Each module in `tools/` implements the corresponding functions utilizing robust input validation via Pydantic schemas.

## Dependencies

- Python `mcp` package (specifically using `FastMCP`)
- `pydantic` for schema validation
- `supabase` Python client (configured in `db.py`)

## Check When Done

- `server.py` exists and successfully boots the `FastMCP` server.
- `db.py` properly exports the initialized database client.
- All 5 tools are defined, registered via `FastMCP`, and thoroughly typed with Pydantic schemas.
- `tools` directory is fully populated with modular implementations.
