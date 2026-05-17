import pytest
from mcp_server.server import mcp

def test_mcp_server_initialization():
    assert mcp.name == "AI Service Marketplace MCP Server"
    assert len(mcp._tool_manager.list_tools()) >= 5

def test_mcp_tool_registration():
    tools = {t.name for t in mcp._tool_manager.list_tools()}
    expected_tools = {
        "find_providers_tool",
        "rank_providers_tool",
        "create_booking_tool",
        "schedule_followups_tool",
        "write_trace_log_tool",
        "create_session_tool",
        "update_session_status_tool"
    }
    for tool in expected_tools:
        assert tool in tools

def test_mcp_tool_metadata():
    tool = next(t for t in mcp._tool_manager.list_tools() if t.name == "find_providers_tool")
    assert "Find providers" in tool.description
    assert tool.fn is not None
