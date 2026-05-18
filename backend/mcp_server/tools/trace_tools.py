"""
trace_tools.py — MCP tool: write_trace_log

Persists a single agent reasoning step to the TRACE_LOGS table for full
transparency in the admin trace dashboard.
"""

from typing import Any, Optional

from pydantic import BaseModel, Field

from mcp_server.db import supabase_client


class CreateSessionInput(BaseModel):
    user_id: str = Field(..., description="UUID of the user starting the session")
    raw_input: str = Field(..., description="The user's initial raw request text")
    session_id: Optional[str] = Field(None, description="Optional UUID to use for the session")


class CreateSessionOutput(BaseModel):
    session_id: str
    status: str


class UpdateSessionInput(BaseModel):
    session_id: str = Field(..., description="UUID of the session to update")
    status: str = Field(..., description="New status, e.g. 'completed', 'failed'")
    detected_language: str = Field(None, description="The language detected by the intent agent")


class UpdateSessionOutput(BaseModel):
    session_id: str
    status: str


class WriteTraceLogInput(BaseModel):
    session_id: str = Field(..., description="UUID of the session this trace belongs to")
    step: int = Field(..., ge=1, description="Ordered step number in the agent pipeline")
    agent_name: str = Field(..., description="Name of the agent writing this log, e.g. 'DiscoveryAgent'")
    tool_used: str = Field(..., description="Name of the MCP tool invoked in this step")
    input_payload: dict[str, Any] = Field(default_factory=dict, description="Serialised tool input")
    output_payload: dict[str, Any] = Field(default_factory=dict, description="Serialised tool output")
    output_summary: str = Field(..., description="Short human-readable summary of what this step produced")
    duration_ms: int = Field(..., ge=0, description="Wall-clock time taken for this step in milliseconds")


class WriteTraceLogOutput(BaseModel):
    trace_id: str
    session_id: str
    step: int


def write_trace_log(input: WriteTraceLogInput) -> WriteTraceLogOutput:
    """
    Inserts a TRACE_LOGS row capturing agent reasoning, tool inputs/outputs,
    and duration for every pipeline step.
    """
    resp = (
        supabase_client.table("trace_logs")
        .insert(
            {
                "session_id": input.session_id,
                "step": input.step,
                "agent_name": input.agent_name,
                "tool_used": input.tool_used,
                "input_payload": input.input_payload,
                "output_payload": input.output_payload,
                "output_summary": input.output_summary,
                "duration_ms": input.duration_ms,
            }
        )
        .execute()
    )

    row = resp.data[0]
    return WriteTraceLogOutput(
        trace_id=row["id"],
        session_id=row["session_id"],
        step=row["step"],
    )


def create_session(input: CreateSessionInput) -> CreateSessionOutput:
    """
    Creates or updates an agent session in the database safely (idempotently).
    """
    session_data = {
        "user_id": input.user_id,
        "raw_input": input.raw_input,
        "status": "in_progress",
    }
    if input.session_id:
        session_data["id"] = input.session_id

    # Use upsert to avoid primary key violations
    resp = (
        supabase_client.table("sessions")
        .upsert(session_data, on_conflict="id")
        .execute()
    )
    row = resp.data[0]
    return CreateSessionOutput(session_id=row["id"], status=row["status"])


def update_session_status(input: UpdateSessionInput) -> UpdateSessionOutput:
    """
    Updates the status and metadata of an existing session.
    """
    update_data = {"status": input.status}
    if input.detected_language:
        update_data["detected_language"] = input.detected_language
    
    if input.status in ["completed", "failed"]:
        import datetime
        update_data["completed_at"] = datetime.datetime.now().isoformat()

    resp = (
        supabase_client.table("sessions")
        .update(update_data)
        .eq("id", input.session_id)
        .execute()
    )
    row = resp.data[0]
    return UpdateSessionOutput(session_id=row["id"], status=row["status"])
