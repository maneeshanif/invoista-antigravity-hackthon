"""
server.py — MCP Server entry point.

Initialises a FastMCP server and registers all domain tools:
  - find_providers      → provider_tools.py
  - rank_providers      → ranking_tools.py
  - create_booking      → booking_tools.py
  - schedule_followups  → notification_tools.py
  - write_trace_log     → trace_tools.py

Run with:
    uv run python -m mcp_server.server
or via MCP dev mode:
    mcp dev mcp_server/server.py
"""

import os
from mcp.server.fastmcp import FastMCP

from mcp_server.tools.booking_tools import (
    CreateBookingInput,
    CreateBookingOutput,
    create_booking,
)
from mcp_server.tools.notification_tools import (
    ScheduleFollowupsInput,
    ScheduleFollowupsOutput,
    schedule_followups,
    SendBookingEmailsInput,
    SendBookingEmailsOutput,
    send_booking_emails,
)
from mcp_server.tools.provider_tools import (
    FindProvidersInput,
    FindProvidersOutput,
    find_providers,
)
from mcp_server.tools.ranking_tools import (
    RankProvidersInput,
    RankProvidersOutput,
    rank_providers,
)
from mcp_server.tools.trace_tools import (
    CreateSessionInput,
    CreateSessionOutput,
    UpdateSessionInput,
    UpdateSessionOutput,
    WriteTraceLogInput,
    WriteTraceLogOutput,
    create_session,
    update_session_status,
    write_trace_log,
)

# ---------------------------------------------------------------------------
# FastMCP server instance
# ---------------------------------------------------------------------------
mcp = FastMCP(
    name="AI Service Marketplace MCP Server",
    instructions=(
        "This MCP server exposes the tool layer for the AI Service Marketplace "
        "agent pipeline. Use these tools in order: find_providers → rank_providers "
        "→ create_booking → schedule_followups. Write a trace log after every step "
        "using write_trace_log."
    ),
    host="0.0.0.0",
    port=int(os.environ.get("MCP_PORT", 8001))
)


# ---------------------------------------------------------------------------
# Tool registrations
# ---------------------------------------------------------------------------

@mcp.tool()
def find_providers_tool(input: FindProvidersInput) -> FindProvidersOutput:
    """
    Find providers matching the service type and area,
    along with their available slots for the requested date.
    """
    return find_providers(input)


@mcp.tool()
def rank_providers_tool(input: RankProvidersInput) -> RankProvidersOutput:
    """
    Rank the discovered providers using the scoring formula:
    score = (rating * 0.40) + (proximity * 0.35) + (availability * 0.25)
    """
    return rank_providers(input)


@mcp.tool()
def create_booking_tool(input: CreateBookingInput) -> CreateBookingOutput:
    """
    Create a booking for the selected provider slot and return a confirmation code.
    """
    return create_booking(input)


@mcp.tool()
def schedule_followups_tool(input: ScheduleFollowupsInput) -> ScheduleFollowupsOutput:
    """
    Schedule a reminder (1 h before) and a completion check (1 h after) notification
    for the booking. These will be dispatched by the Celery worker.
    """
    return schedule_followups(input)


@mcp.tool()
def send_booking_emails_tool(input: SendBookingEmailsInput) -> SendBookingEmailsOutput:
    """
    Dispatch booking confirmation emails to both the user and the provider.
    """
    return send_booking_emails(input)


@mcp.tool()
def write_trace_log_tool(input: WriteTraceLogInput) -> WriteTraceLogOutput:
    """
    Persist an agent reasoning step — tool inputs, outputs, summary, and duration —
    to the trace_logs table for admin dashboard visibility.
    """
    return write_trace_log(input)


@mcp.tool()
def create_session_tool(input: CreateSessionInput) -> CreateSessionOutput:
    """
    Create a new user session in the database.
    """
    return create_session(input)


@mcp.tool()
def update_session_status_tool(input: UpdateSessionInput) -> UpdateSessionOutput:
    """
    Update the status and language of an existing session.
    """
    return update_session_status(input)


# ---------------------------------------------------------------------------
# Entry point — Streamable HTTP transport
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    mcp.run(transport="sse")
    # Tools will be available at: http://localhost:8001/sse
