"""
trace_tools.py — MCP tool: write_trace_log

Persists a single agent reasoning step to the TRACE_LOGS table for full
transparency in the admin trace dashboard.
"""

from typing import Any

from pydantic import BaseModel, Field

from mcp_server.db import supabase_client


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
