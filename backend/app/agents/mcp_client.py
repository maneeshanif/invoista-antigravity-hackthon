"""
mcp_client.py — A helper to communicate with the MCP server.

This client starts the MCP server as a subprocess and allows agents
to invoke tools via the Model Context Protocol.
"""

import asyncio
import contextlib
import json
import os
import sys
from typing import Any, Optional

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client


class MCPClient:
    def __init__(self):
        # Parameters to start the MCP server
        # We run it using 'uv run python -m mcp_server.server'
        self.server_params = StdioServerParameters(
            command=sys.executable,
            args=["-m", "mcp_server.server"],
            env=os.environ.copy(),
        )
        self.session: Optional[ClientSession] = None
        self._exit_stack = None

    async def connect(self):
        """Initializes the connection to the MCP server."""
        self._exit_stack = contextlib.AsyncExitStack()
        read_stream, write_stream = await self._exit_stack.enter_async_context(
            stdio_client(self.server_params)
        )
        self.session = await self._exit_stack.enter_async_context(
            ClientSession(read_stream, write_stream)
        )
        await self.session.initialize()

    async def disconnect(self):
        """Closes the connection."""
        if self._exit_stack:
            await self._exit_stack.aclose()

    async def call_tool(self, tool_name: str, arguments: dict[str, Any]) -> Any:
        """Calls a tool on the MCP server."""
        if not self.session:
            await self.connect()
        
        # In FastMCP, tools are often registered with a suffix or specific naming
        # but here we use the names defined in server.py
        result = await self.session.call_tool(tool_name, arguments)
        
        # FastMCP results are usually in result.content
        if hasattr(result, "content") and result.content:
            # Assuming the output is JSON or text that can be parsed
            text_content = result.content[0].text
            try:
                return json.loads(text_content)
            except:
                return text_content
        return result

# Singleton instance for the orchestrator
_client_instance: Optional[MCPClient] = None

async def get_mcp_client() -> MCPClient:
    global _client_instance
    if _client_instance is None:
        _client_instance = MCPClient()
        await _client_instance.connect()
    return _client_instance
