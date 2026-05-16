"""
orchestrator.py — Lead Orchestrator using OpenAI Agents SDK multi-agent pattern.

Architecture:
  - Each specialist agent is a real SDK Agent with mcp_servers=[mcp]
  - All agents are passed as tools to the Orchestrator via agent.as_tool()
  - The Orchestrator LLM is prompted to handle intent extraction internally, 
    then call sub-agents strictly in sequence.
  - LLM Fallback: If OpenAI fails, the Orchestrator retries with Gemini.
"""

from agents import Agent, Runner, RunConfig , enable_verbose_stdout_logging
from agents.mcp import MCPServerSse
from openai import APIStatusError

from app.agents.llm_client import get_model, get_fallback_model
from app.agents.prompts import (
    ORCHESTRATOR_PROMPT, 
    DISCOVERY_AGENT_PROMPT, 
    RANKING_AGENT_PROMPT, 
    BOOKING_AGENT_PROMPT, 
    FOLLOWUP_AGENT_PROMPT
)
from app.agents.discovery_agent import create_discovery_agent
from app.agents.ranking_agent import create_ranking_agent
from app.agents.booking_agent import create_booking_agent
from app.agents.followup_agent import create_followup_agent
from app.core.config import settings


enable_verbose_stdout_logging()


async def run_workflow(user_input: str, user_id: str) -> dict:
    """
    Entry point for the full agent pipeline.

    The Orchestrator Agent handles intent extraction itself (no IntentAgent).
    Then calls 4 specialist sub-agents as tools in strict sequence.
    """
    async with MCPServerSse(
        params={"url": settings.MCP_SERVER_URL},
        cache_tools_list=True,
    ) as mcp:

        # --- Initial Message for the Orchestrator ---
        initial_message = (
            f"user_id: {user_id}\n"
            f"user_request: {user_input}\n\n"
            "Understand the request, extract intent, then process through all steps in order."
        )

        try:
            # --- Try with Primary Model (OpenAI) ---
            # Build sub-agents
            discovery_agent = create_discovery_agent(mcp)
            ranking_agent   = create_ranking_agent(mcp)
            booking_agent   = create_booking_agent(mcp)
            followup_agent  = create_followup_agent(mcp)

            # Wrap as tools
            tools = [
                discovery_agent.as_tool(tool_name="run_discovery", tool_description="Find available providers."),
                ranking_agent.as_tool(tool_name="run_ranking", tool_description="Rank providers list."),
                booking_agent.as_tool(tool_name="run_booking", tool_description="Create a booking."),
                followup_agent.as_tool(tool_name="run_followup", tool_description="Schedule notifications."),
            ]

            orchestrator = Agent(
                name="Orchestrator",
                instructions=ORCHESTRATOR_PROMPT,
                model=get_model(),
                tools=tools,
                mcp_servers=[mcp],
            )
            result = await Runner.run(
                orchestrator,
                input=initial_message,
                run_config=RunConfig(tracing_disabled=True),
            )
        except (APIStatusError, ValueError) as e:
            # --- Fallback to Gemini if OpenAI fails OR key is missing ---
            print(f"DEBUG: OpenAI initialization failed or API error: {e}")
            print("Falling back to Gemini...")
            
            # Re-build everything with the fallback model
            # Note: We need to update the model in sub-agents too
            # For simplicity, we just create new agents with fallback model
            
            def create_fallback_agent(name, instructions):
                return Agent(name=name, instructions=instructions, model=get_fallback_model(), mcp_servers=[mcp])

            f_discovery = create_fallback_agent("DiscoveryAgent", DISCOVERY_AGENT_PROMPT)
            f_ranking   = create_fallback_agent("RankingAgent", RANKING_AGENT_PROMPT)
            f_booking   = create_fallback_agent("BookingAgent", BOOKING_AGENT_PROMPT)
            f_followup  = create_fallback_agent("FollowupAgent", FOLLOWUP_AGENT_PROMPT)

            fallback_tools = [
                f_discovery.as_tool(tool_name="run_discovery", tool_description="Find available providers."),
                f_ranking.as_tool(tool_name="run_ranking", tool_description="Rank providers list."),
                f_booking.as_tool(tool_name="run_booking", tool_description="Create a booking."),
                f_followup.as_tool(tool_name="run_followup", tool_description="Schedule notifications."),
            ]

            orchestrator_fallback = Agent(
                name="Orchestrator-Fallback",
                instructions=ORCHESTRATOR_PROMPT,
                model=get_fallback_model(),
                tools=fallback_tools,
                mcp_servers=[mcp],
            )
            result = await Runner.run(
                orchestrator_fallback,
                input=initial_message,
                run_config=RunConfig(tracing_disabled=True),
            )

        return {
            "status": "success",
            "summary": result.final_output,
        }
