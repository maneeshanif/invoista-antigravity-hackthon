"""
orchestrator.py — Lead Orchestrator using OpenAI Agents SDK multi-agent pattern.

Architecture:
  - Each specialist agent is a real SDK Agent with mcp_servers=[mcp]
  - All agents are passed as tools to the Orchestrator via agent.as_tool()
  - The Orchestrator LLM is prompted to handle intent extraction internally, 
    then call sub-agents strictly in sequence.
  - The Orchestrator does NOT have direct MCP access — only its sub-agents do.
  - LLM Fallback: If OpenAI fails, the Orchestrator retries with Gemini.

HITL Flow (Feature 10):
  - The `run_booking` tool is marked with `needs_approval=True`.
  - Phase 1 (`start_workflow`): Runs Discovery + Ranking. When the SDK pauses
    at the `run_booking` interruption, the serialised RunState is returned.
  - Phase 2 (`resume_workflow`): Loads the stored RunState, applies the user
    decision (approve/reject), and resumes the run.
"""

from agents import Agent, Runner, RunConfig, RunState, enable_verbose_stdout_logging, ModelSettings
from agents.mcp import MCPServerSse
import asyncio
import json
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


def _build_orchestrator(
    mcp: MCPServerSse,
    trace_agent_hooks: TraceAgentHooks | None = None,
    model_getter=None,
) -> Agent:
    """
    Build the Orchestrator agent with all sub-agents as tools.
    Shared between start_workflow and resume_workflow so the agent
    definition is identical (required for RunState deserialisation).
    """
    if model_getter is None:
        model_getter = get_model

    discovery_agent = create_discovery_agent(mcp)
    ranking_agent   = create_ranking_agent(mcp)
    booking_agent   = create_booking_agent(mcp)
    followup_agent  = create_followup_agent(mcp)

    if trace_agent_hooks:
        discovery_agent.hooks = trace_agent_hooks
        ranking_agent.hooks   = trace_agent_hooks
        booking_agent.hooks   = trace_agent_hooks
        followup_agent.hooks  = trace_agent_hooks

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
            tool_description=(
                "Create a confirmed booking for the top-ranked provider. "
                "Pass user_id, provider_id, slot_id, provider_name, "
                "provider_rating, and estimated_distance_km."
            ),
            needs_approval=True,   # ← HITL gate — SDK will pause before calling this
        ),
        followup_agent.as_tool(
            tool_name="run_followup",
            tool_description="Schedule follow-up notifications. Pass booking_id, user_id, slot_date, and slot_time."
        ),
    ]

    orchestrator = Agent(
        name="Orchestrator",
        instructions=ORCHESTRATOR_PROMPT,
        model=model_getter(),
        tools=tools,
    )

    if trace_agent_hooks:
        orchestrator.hooks = trace_agent_hooks

    return orchestrator


def _parse_provider_summary(arguments: str | None) -> dict:
    """
    Extract human-readable provider details from the run_booking tool arguments.
    The arguments are a JSON string with at minimum: provider_id, slot_id, user_id.
    """
    try:
        args = json.loads(arguments or "{}")
        if "input" in args:
            inner = json.loads(args["input"])
            if isinstance(inner, dict):
                args = inner
    except Exception:
        args = {}

    return {
        "provider_id":          args.get("provider_id", "unknown"),
        "slot_id":              args.get("slot_id", "unknown"),
        "provider_name":        args.get("provider_name", "Selected Provider"),
        "provider_rating":      args.get("provider_rating", 0),
        "estimated_distance_km": args.get("estimated_distance_km", 0),
        "raw_arguments":        args,
    }


async def start_workflow(user_input: str, user_id: str, session_id: str) -> dict:
    """
    Phase 1: Run Discovery + Ranking.
    Pauses when run_booking fires its HITL interruption.
    Returns serialised RunState + provider summary for the frontend.
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

        today = date.today().isoformat()
        initial_message = (
            f"session_id: {session_id}\n"
            f"user_id: {user_id}\n"
            f"today_date: {today}\n"
            f"user_request: {user_input}\n\n"
            "Understand the request, extract intent, compute the correct slot_date from today_date, "
            "then process through all steps in order."
        )

        try:
            orchestrator = _build_orchestrator(mcp, trace_agent_hooks)

            result = await Runner.run(
                orchestrator,
                input=initial_message,
                hooks=trace_run_hooks,
                run_config=RunConfig(
                    tracing_disabled=True,
                    model_settings=ModelSettings(parallel_tool_calls=False),
                ),
            )

            # Check if the SDK paused for HITL approval
            if result.interruptions:
                state = result.to_state()
                state_payload = state.to_json()

                interruption = result.interruptions[0]
                provider_summary = _parse_provider_summary(
                    getattr(interruption, 'arguments', None)
                    or getattr(interruption, 'raw_arguments', None)
                )

                return {
                    "status": "pending_approval",
                    "state_payload": state_payload,
                    "provider_summary": provider_summary,
                }

            # No interruption — booking ran directly (unlikely with needs_approval=True)
            final_status = "completed"
            if (
                trace_run_hooks.has_providers_found is False 
                or (trace_run_hooks.has_providers_found is True and not trace_run_hooks.has_booking_created)
            ):
                final_status = "failed"

            await asyncio.to_thread(update_session_status, UpdateSessionInput(
                session_id=session_id,
                status=final_status
            ))

            return {
                "status": final_status,
                "summary": result.final_output,
            }

        except (APIStatusError, ValueError) as e:
            # --- Fallback to Gemini if OpenAI fails ---
            print(f"DEBUG: OpenAI initialization failed or API error: {e}")
            print("Falling back to Gemini...")
            try:
                orchestrator_fallback = _build_orchestrator(
                    mcp, trace_agent_hooks, model_getter=get_fallback_model
                )

                result = await Runner.run(
                    orchestrator_fallback,
                    input=initial_message,
                    hooks=trace_run_hooks,
                    run_config=RunConfig(
                        tracing_disabled=True,
                        model_settings=ModelSettings(parallel_tool_calls=False),
                    ),
                )

                if result.interruptions:
                    state = result.to_state()
                    state_payload = state.to_json()
                    interruption = result.interruptions[0]
                    provider_summary = _parse_provider_summary(
                        getattr(interruption, 'arguments', None)
                        or getattr(interruption, 'raw_arguments', None)
                    )
                    return {
                        "status": "pending_approval",
                        "state_payload": state_payload,
                        "provider_summary": provider_summary,
                    }

                final_status = "completed"
                if (
                    trace_run_hooks.has_providers_found is False 
                    or (trace_run_hooks.has_providers_found is True and not trace_run_hooks.has_booking_created)
                ):
                    final_status = "failed"

                await asyncio.to_thread(update_session_status, UpdateSessionInput(
                    session_id=session_id,
                    status=final_status
                ))

                return {
                    "status": final_status,
                    "summary": result.final_output,
                }

            except Exception as inner_e:
                await asyncio.to_thread(update_session_status, UpdateSessionInput(
                    session_id=session_id,
                    status="failed"
                ))
                raise inner_e

        except Exception as e:
            await asyncio.to_thread(update_session_status, UpdateSessionInput(
                session_id=session_id,
                status="failed"
            ))
            raise e


async def resume_workflow(
    session_id: str,
    approved: bool,
    state_payload: dict,
    user_id: str,
    rejection_message: str = "The user chose not to proceed with this booking. Politely inform them the booking has been cancelled and that they can start a new request anytime.",
) -> dict:
    """
    Phase 2: Resume from stored RunState after user decision.
    If approved → BookingAgent runs → FollowupAgent runs.
    If rejected → sends rejection message back into the run.
    """
    async with MCPServerSse(
        params={"url": settings.MCP_SERVER_URL},
        cache_tools_list=True,
    ) as mcp:
        trace_run_hooks = TraceRunHooks(session_id=session_id)
        trace_agent_hooks = TraceAgentHooks(session_id=session_id)

        orchestrator = _build_orchestrator(mcp, trace_agent_hooks)

        # Reconstruct the paused run
        state = await RunState.from_json(orchestrator, state_payload)

        for interruption in state.get_interruptions():
            if approved:
                state.approve(interruption, always_approve=False)
            else:
                state.reject(
                    interruption,
                    rejection_message=rejection_message,
                )

        result = await Runner.run(
            orchestrator,
            state,
            hooks=trace_run_hooks,
            run_config=RunConfig(
                tracing_disabled=True,
                model_settings=ModelSettings(parallel_tool_calls=False),
            ),
        )

        # Check if the SDK paused for HITL approval again
        if result.interruptions:
            new_state = result.to_state()
            new_state_payload = new_state.to_json()
            interruption = result.interruptions[0]
            provider_summary = _parse_provider_summary(
                getattr(interruption, 'arguments', None)
                or getattr(interruption, 'raw_arguments', None)
            )

            await asyncio.to_thread(update_session_status, UpdateSessionInput(
                session_id=session_id,
                status="pending_approval"
            ))

            return {
                "status": "pending_approval",
                "state_payload": new_state_payload,
                "provider_summary": provider_summary,
            }

        final_status = "completed" if approved else "cancelled"

        # If approved but booking still didn't happen, mark failed
        if approved and not trace_run_hooks.has_booking_created:
            final_status = "failed"

        await asyncio.to_thread(update_session_status, UpdateSessionInput(
            session_id=session_id,
            status=final_status
        ))

        return {
            "status": final_status,
            "summary": result.final_output,
        }


# --- Legacy entrypoint kept for backwards compatibility ---
async def run_workflow(user_input: str, user_id: str, session_id: str) -> dict:
    """
    Original single-shot workflow. Now delegates to start_workflow.
    The HITL pause will be stored in DB by the calling route handler.
    """
    return await start_workflow(user_input, user_id, session_id)
