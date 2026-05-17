from __future__ import annotations

import time
from typing import Any

from agents.lifecycle import AgentHooksBase, RunHooksBase
from agents.run_context import RunContextWrapper
from agents.agent import Agent
from agents.tool import Tool
from agents.items import ModelResponse

from nami_agents.observability.logging import log_event

_RED    = "\033[91m"
_PURPLE = "\033[95m"
_RESET  = "\033[0m"

_SEP_RED    = _RED    + "=" * 60 + _RESET
_SEP_PURPLE = _PURPLE + "=" * 60 + _RESET


def _r(text: str) -> str:
    return f"{_RED}{text}{_RESET}"


def _p(text: str) -> str:
    return f"{_PURPLE}{text}{_RESET}"


class NamiAgentHooks(AgentHooksBase[Any, Agent[Any]]):
    """Per-agent lifecycle hooks — red console output + structured log_event JSON."""

    def __init__(self) -> None:
        self._start_time: float | None = None

    async def on_start(self, context: RunContextWrapper[Any], agent: Agent[Any]) -> None:
        self._start_time = time.time()
        print(_SEP_RED)
        print(_r(f"🚀 [AGENT HOOK] START ▶ {agent.name}"))
        print(_SEP_RED)
        log_event("agent.start", agent=agent.name)

    async def on_end(self, context: RunContextWrapper[Any], agent: Agent[Any], output: Any) -> None:
        elapsed = round(time.time() - self._start_time, 3) if self._start_time else None
        output_str = str(output)[:500] if output else "None"
        print(_SEP_RED)
        print(_r(f"✅ [AGENT HOOK] END ◀ {agent.name}  ({elapsed}s)"))
        print(_r(f"   Output: {output_str}"))
        print(_SEP_RED)
        log_event("agent.end", agent=agent.name, output_preview=output_str, elapsed_sec=elapsed)

    async def on_llm_start(
        self,
        context: RunContextWrapper[Any],
        agent: Agent[Any],
        system_prompt: str | None,
        input_items: list[Any],
    ) -> None:
        preview = system_prompt[:200] if system_prompt else "(none)"
        print(_SEP_RED)
        print(_r(f"🧠 [AGENT HOOK] LLM START ▶ {agent.name}"))
        print(_r(f"   System prompt ({len(system_prompt) if system_prompt else 0} chars): {preview}..."))
        print(_r(f"   Input items: {len(input_items)}"))
        print(_SEP_RED)
        log_event(
            "agent.llm_start",
            agent=agent.name,
            system_prompt_chars=len(system_prompt) if system_prompt else 0,
            system_prompt_preview=system_prompt[:300] if system_prompt else None,
            input_items_count=len(input_items),
        )

    async def on_llm_end(
        self,
        context: RunContextWrapper[Any],
        agent: Agent[Any],
        response: ModelResponse,
    ) -> None:
        response_text = response.text if hasattr(response, "text") else str(response)
        preview = response_text[:400] if response_text else "(empty)"
        print(_SEP_RED)
        print(_r(f"💬 [AGENT HOOK] LLM END ◀ {agent.name}"))
        print(_r(f"   Response: {preview}"))
        print(_SEP_RED)
        log_event("agent.llm_end", agent=agent.name, response_preview=response_text[:500] if response_text else None)

    async def on_tool_start(
        self,
        context: RunContextWrapper[Any],
        agent: Agent[Any],
        tool: Tool,
    ) -> None:
        tool_args = getattr(context, "tool_arguments", None)
        args_str = str(tool_args)[:300] if tool_args else "(unavailable)"
        print(_SEP_RED)
        print(_r(f"🔧 [AGENT HOOK] TOOL START ▶ {tool.name}  (agent: {agent.name})"))
        print(_r(f"   Input: {args_str}"))
        print(_SEP_RED)
        log_event("agent.tool_start", agent=agent.name, tool=tool.name, tool_input=str(tool_args)[:300] if tool_args else None)

    async def on_tool_end(
        self,
        context: RunContextWrapper[Any],
        agent: Agent[Any],
        tool: Tool,
        result: Any,
    ) -> None:
        result_str = str(result)[:500]
        print(_SEP_RED)
        print(_r(f"✔️  [AGENT HOOK] TOOL END ◀ {tool.name}  (agent: {agent.name})"))
        print(_r(f"   Result: {result_str}"))
        print(_SEP_RED)
        log_event("agent.tool_end", agent=agent.name, tool=tool.name, result_preview=result_str)


class DebugHooks(RunHooksBase[Any, Agent[Any]]):
    """Run-level hooks for the orchestrator runner — blue console output."""

    async def on_agent_start(
        self,
        context: RunContextWrapper[Any],
        agent: Agent[Any],
    ) -> None:
        print(_SEP_PURPLE)
        print(_p(f"🔵 [RUN HOOK] AGENT START ▶ {agent.name}"))
        print(_SEP_PURPLE)

    async def on_agent_end(
        self,
        context: RunContextWrapper[Any],
        agent: Agent[Any],
        output: Any,
    ) -> None:
        output_str = str(output)[:500] if output else "None"
        print(_SEP_PURPLE)
        print(_p(f"🔴 [RUN HOOK] AGENT END ◀ {agent.name}"))
        print(_p(f"   Output: {output_str}"))
        print(_SEP_PURPLE)

    async def on_llm_start(
        self,
        context: RunContextWrapper[Any],
        agent: Agent[Any],
        system_prompt: str | None,
        input_items: list[Any],
    ) -> None:
        preview = system_prompt[:200] if system_prompt else "(none)"
        print(_SEP_PURPLE)
        print(_p(f"📝 [RUN HOOK] LLM START ▶ {agent.name}"))
        print(_p(f"   System prompt ({len(system_prompt) if system_prompt else 0} chars): {preview}..."))
        print(_p(f"   Input items: {len(input_items)}"))
        print(_SEP_PURPLE)

    async def on_llm_end(
        self,
        context: RunContextWrapper[Any],
        agent: Agent[Any],
        response: ModelResponse,
    ) -> None:
        response_text = response.text if hasattr(response, "text") else str(response)
        print(_SEP_PURPLE)
        print(_p(f"📝 [RUN HOOK] LLM END ◀ {agent.name}"))
        print(_p(f"   Response: {response_text[:400]}..."))
        print(_SEP_PURPLE)

    async def on_tool_start(
        self,
        context: RunContextWrapper[Any],
        agent: Agent[Any],
        tool: Tool,
    ) -> None:
        tool_args = getattr(context, "tool_arguments", None)
        print(_SEP_PURPLE)
        print(_p(f"🔧 [RUN HOOK] TOOL START ▶ {tool.name}  (agent: {agent.name})"))
        if tool_args:
            print(_p(f"   Input: {str(tool_args)[:300]}"))
        print(_SEP_PURPLE)

    async def on_tool_end(
        self,
        context: RunContextWrapper[Any],
        agent: Agent[Any],
        tool: Tool,
        result: Any,
    ) -> None:
        result_str = str(result)[:500]
        print(_SEP_PURPLE)
        print(_p(f"✅ [RUN HOOK] TOOL END ◀ {tool.name}  (agent: {agent.name})"))
        print(_p(f"   Result: {result_str}"))
        print(_SEP_PURPLE)