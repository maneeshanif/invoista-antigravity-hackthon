"""
ranking_agent.py — SDK Agent that calls rank_providers_tool via MCP.
"""
from agents import Agent
from agents.mcp import MCPServerSse
from app.agents.llm_client import get_model
from app.agents.prompts import RANKING_AGENT_PROMPT


def create_ranking_agent(mcp: MCPServerSse) -> Agent:
    """
    Creates a specialist Ranking Agent.
    It has access to the MCP server to call rank_providers_tool.
    """
    return Agent(
        name="RankingAgent",
        instructions=RANKING_AGENT_PROMPT,
        model=get_model(),
        mcp_servers=[mcp],
    )
