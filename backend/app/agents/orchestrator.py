"""
orchestrator.py — Lead Orchestrator using OpenAI Agents SDK multi-agent pattern.

Architecture:
  - Each specialist agent is a real SDK Agent with mcp_servers=[mcp]
  - All agents are passed as tools to the Orchestrator via agent.as_tool()
  - The Orchestrator LLM is prompted to handle intent extraction internally, 
    then call sub-agents strictly in sequence.
  - The Orchestrator does NOT have direct MCP access — only its sub-agents do.
  - LLM Fallback: If OpenAI fails, the Orchestrator retries with Gemini.
"""

from agents import Agent, Runner, RunConfig, enable_verbose_stdout_logging, ModelSettings
from agents.mcp import MCPServerSse
import asyncio
from datetime import date
from openai import APIStatusError

from app.agents.llm_client import get_model, get_fallback_model, get_secondary_fallback_model
from app.agents.hooks import TraceRunHooks, TraceAgentHooks
from mcp_server.tools.trace_tools import create_session, CreateSessionInput, update_session_status, UpdateSessionInput
from app.agents.prompts import (
    ORCHESTRATOR_PROMPT, 
    DISCOVERY_AGENT_PROMPT, 
    RANKING_AGENT_PROMPT, 
    BOOKING_AGENT_PROMPT, 
    FOLLOWUP_AGENT_PROMPT,
)
from app.agents.discovery_agent import create_discovery_agent
from app.agents.ranking_agent import create_ranking_agent
from app.agents.booking_agent import create_booking_agent
from app.agents.followup_agent import create_followup_agent
from app.core.config import settings


enable_verbose_stdout_logging()


async def run_workflow(user_input: str, user_id: str, session_id: str) -> dict:
    """
    Entry point for the full agent pipeline.

    The Orchestrator Agent handles intent extraction itself (no IntentAgent).
    Then calls 4 specialist sub-agents as tools in strict sequence.
    Session is created programmatically before the agent runs.
    """
    async with MCPServerSse(
        params={"url": settings.MCP_SERVER_URL},
        cache_tools_list=True,
    ) as mcp:
        # Step 0: Create Session (programmatic — NOT done by the LLM)
        print(f"Creating session for input: {user_input[:20]}...")
        await asyncio.to_thread(create_session, CreateSessionInput(
            user_id=user_id,
            raw_input=user_input,
            session_id=session_id
        ))
        
        trace_run_hooks = TraceRunHooks(session_id=session_id)
        trace_agent_hooks = TraceAgentHooks(session_id=session_id)

        # --- Initial Message for the Orchestrator ---
        today = date.today().isoformat()
        initial_message = (
            f"session_id: {session_id}\n"
            f"user_id: {user_id}\n"
            f"today_date: {today}\n"
            f"user_request: {user_input}\n\n"
            "Understand the request, extract intent, compute the correct slot_date from today_date, "
            "then process through all 4 steps in order."
        )

        try:
            discovery_agent = create_discovery_agent(mcp)
            discovery_agent.hooks = trace_agent_hooks
            ranking_agent   = create_ranking_agent(mcp)
            ranking_agent.hooks = trace_agent_hooks
            booking_agent   = create_booking_agent(mcp)
            booking_agent.hooks = trace_agent_hooks
            followup_agent  = create_followup_agent(mcp)
            followup_agent.hooks = trace_agent_hooks

            tools = [
                discovery_agent.as_tool(
                    tool_name="run_discovery",
                    tool_description="Find available providers matching service type and area. Pass service_type, area, and slot_date."
                ),
                ranking_agent.as_tool(
                    tool_name="run_ranking",
                    tool_description="Rank a list of providers by score. Pass provider list with available_slots_count, user_lat, user_lng."
                ),
                booking_agent.as_tool(
                    tool_name="run_booking",
                    tool_description="Create a booking for a provider slot. Pass user_id, provider_id, and slot_id."
                ),
                followup_agent.as_tool(
                    tool_name="run_followup",
                    tool_description="Schedule follow-up notifications. Pass booking_id, user_id, slot_date, and slot_time."
                ),
            ]

            orchestrator = Agent(
                name="Orchestrator",
                instructions=ORCHESTRATOR_PROMPT,
                model=get_model(),
                tools=tools,
                hooks=trace_agent_hooks,
            )
            result = await Runner.run(
                orchestrator,
                input=initial_message,
                hooks=trace_run_hooks,
                run_config=RunConfig(tracing_disabled=True, model_settings=ModelSettings(parallel_tool_calls=False)),
            )

            await asyncio.to_thread(update_session_status, UpdateSessionInput(
                session_id=session_id,
                status="completed"
            ))

        except Exception as e:
            await asyncio.to_thread(update_session_status, UpdateSessionInput(
                session_id=session_id,
                status="failed"
            ))
            raise e

        return {
            "status": "success",
            "summary": result.final_output,
        }
