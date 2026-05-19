"""
notification_agent.py — SDK Agent that dispatches booking emails via MCP.
"""
from agents import Agent
from agents.mcp import MCPServerSse
from app.agents.llm_client import get_model
from app.agents.prompts import NOTIFICATION_AGENT_PROMPT


def create_notification_agent(mcp: MCPServerSse) -> Agent:
    """
    Creates a specialist Notification Agent.
    It has access to the MCP server to call send_booking_emails_tool.
    """
    return Agent(
        name="NotificationAgent",
        instructions=NOTIFICATION_AGENT_PROMPT,
        model=get_model(),
        mcp_servers=[mcp],
    )
