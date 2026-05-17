"""
discovery_agent.py — SDK Agent that calls find_providers_tool via MCP.
"""
from agents import Agent
from agents.mcp import MCPServerSse
from app.agents.llm_client import get_model
from app.agents.prompts import DISCOVERY_AGENT_PROMPT

def create_discovery_agent(mcp: MCPServerSse) -> Agent:
    """
    Creates a specialist Discovery Agent.
    It has access to the MCP server to call find_providers_tool.
    """
    return Agent(
        name="DiscoveryAgent",
        instructions=DISCOVERY_AGENT_PROMPT,
        model=get_model(),
        mcp_servers=[mcp],
        # The agent sees find_providers_tool auto-discovered from MCP
    )
