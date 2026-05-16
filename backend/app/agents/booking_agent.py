"""
booking_agent.py — SDK Agent that calls create_booking_tool via MCP.
"""
from agents import Agent
from agents.mcp import MCPServerSse
from app.agents.llm_client import get_model
from app.agents.prompts import BOOKING_AGENT_PROMPT


def create_booking_agent(mcp: MCPServerSse) -> Agent:
    """
    Creates a specialist Booking Agent.
    It has access to the MCP server to call create_booking_tool.
    """
    return Agent(
        name="BookingAgent",
        instructions=BOOKING_AGENT_PROMPT,
        model=get_model(),
        mcp_servers=[mcp],
    )
