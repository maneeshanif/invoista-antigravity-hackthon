"""
followup_agent.py — SDK Agent that calls schedule_followups_tool via MCP.
"""
from agents import Agent
from agents.mcp import MCPServerSse
from app.agents.llm_client import get_model
from app.agents.prompts import FOLLOWUP_AGENT_PROMPT


def create_followup_agent(mcp: MCPServerSse) -> Agent:
    """
    Creates a specialist Follow-up Agent.
    It has access to the MCP server to call schedule_followups_tool.
    """
    return Agent(
        name="FollowupAgent",
        instructions=FOLLOWUP_AGENT_PROMPT,
        model=get_model(),
        mcp_servers=[mcp],
    )
