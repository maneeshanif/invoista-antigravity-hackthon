import time
import asyncio
from typing import Any

from agents.lifecycle import RunHooksBase, AgentHooksBase

from mcp_server.tools.trace_tools import write_trace_log, WriteTraceLogInput

_RED    = "\033[91m"
_PURPLE = "\033[95m"
_RESET  = "\033[0m"

_SEP_RED    = _RED    + "=" * 60 + _RESET
_SEP_PURPLE = _PURPLE + "=" * 60 + _RESET

def _r(text: str) -> str:
    return f"{_RED}{text}{_RESET}"

def _p(text: str) -> str:
    return f"{_PURPLE}{text}{_RESET}"


class TraceRunHooks(RunHooksBase):
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.step_counter = 1
        self.start_times = {}

    async def _write_log(self, agent_name: str, tool_used: str, input_payload: dict, output_payload: dict, output_summary: str, duration_ms: int):
        input_data = WriteTraceLogInput(
            session_id=self.session_id,
            step=self.step_counter,
            agent_name=agent_name,
            tool_used=tool_used,
            input_payload=input_payload,
            output_payload=output_payload,
            output_summary=output_summary,
            duration_ms=duration_ms,
        )
        self.step_counter += 1
        
        # Write to DB in a thread to avoid blocking the event loop
        await asyncio.to_thread(write_trace_log, input_data)

    async def on_agent_start(self, context, agent) -> None:
        self.start_times[agent.name] = time.time()
        print(_SEP_PURPLE)
        print(_p(f"🔵 [RUN HOOK] AGENT START ▶ {agent.name}"))
        print(_SEP_PURPLE)

    async def on_agent_end(self, context, agent, output) -> None:
        duration = int((time.time() - self.start_times.get(agent.name, time.time())) * 1000)
        output_str = str(output)[:500] if output else "None"
        print(_SEP_PURPLE)
        print(_p(f"🔴 [RUN HOOK] AGENT END ◀ {agent.name}  ({duration}ms)"))
        print(_p(f"   Output: {output_str}"))
        print(_SEP_PURPLE)
        
        # Try to safely serialize output
        output_payload = {}
        if hasattr(output, "model_dump"):
            output_payload = output.model_dump()
        else:
            output_payload = {"result": str(output)}
            
        await self._write_log(
            agent_name="Runner",
            tool_used=f"agent_{agent.name}",
            input_payload={},
            output_payload=output_payload,
            output_summary=f"Agent {agent.name} completed.",
            duration_ms=duration
        )

    async def on_handoff(self, context, from_agent, to_agent) -> None:
        print(_SEP_PURPLE)
        print(_p(f"🔀 [RUN HOOK] HANDOFF ▶ {from_agent.name} ➡️ {to_agent.name}"))
        print(_SEP_PURPLE)
        
        await self._write_log(
            agent_name="Runner",
            tool_used="handoff",
            input_payload={"from": from_agent.name, "to": to_agent.name},
            output_payload={},
            output_summary=f"Handoff from {from_agent.name} to {to_agent.name}.",
            duration_ms=0
        )

    async def on_tool_start(self, context, agent, tool) -> None:
        self.start_times[tool.name] = time.time()
        tool_args = getattr(context, "tool_arguments", None)
        args_str = str(tool_args)[:300] if tool_args else "(unavailable)"
        print(_SEP_PURPLE)
        print(_p(f"🔧 [RUN HOOK] TOOL START ▶ {tool.name}  (agent: {agent.name})"))
        if tool_args:
            print(_p(f"   Input: {args_str}"))
        print(_SEP_PURPLE)

    async def on_tool_end(self, context, agent, tool, result) -> None:
        duration = int((time.time() - self.start_times.get(tool.name, time.time())) * 1000)
        result_str = str(result)[:500]
        print(_SEP_PURPLE)
        print(_p(f"✅ [RUN HOOK] TOOL END ◀ {tool.name}  (agent: {agent.name})  ({duration}ms)"))
        print(_p(f"   Result: {result_str}"))
        print(_SEP_PURPLE)
        
        output_payload = {}
        if hasattr(result, "model_dump"):
            output_payload = result.model_dump()
        else:
            output_payload = {"result": str(result)}
            
        await self._write_log(
            agent_name=agent.name,
            tool_used=tool.name,
            input_payload={}, # We don't have tool arguments easily accessible here unfortunately, standard is empty
            output_payload=output_payload,
            output_summary=f"Tool {tool.name} executed by {agent.name}.",
            duration_ms=duration
        )

    async def on_llm_start(self, context, agent, system_prompt, input_items) -> None:
        self.start_times[f"llm_{agent.name}"] = time.time()
        preview = system_prompt[:200] if system_prompt else "(none)"
        print(_SEP_PURPLE)
        print(_p(f"📝 [RUN HOOK] LLM START ▶ {agent.name}"))
        print(_p(f"   System prompt ({len(system_prompt) if system_prompt else 0} chars): {preview}..."))
        print(_p(f"   Input items: {len(input_items)}"))
        print(_SEP_PURPLE)

    async def on_llm_end(self, context, agent, response) -> None:
        duration = int((time.time() - self.start_times.get(f"llm_{agent.name}", time.time())) * 1000)
        response_text = response.text if hasattr(response, "text") else str(response)
        print(_SEP_PURPLE)
        print(_p(f"📝 [RUN HOOK] LLM END ◀ {agent.name}  ({duration}ms)"))
        print(_p(f"   Response: {response_text[:400]}..."))
        print(_SEP_PURPLE)
        
        await self._write_log(
            agent_name=agent.name,
            tool_used="llm_call",
            input_payload={},
            output_payload={"response": str(response)},
            output_summary=f"LLM call completed by {agent.name}.",
            duration_ms=duration
        )


class TraceAgentHooks(AgentHooksBase):
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.start_times = {}
        
    async def on_start(self, context, agent) -> None:
        self.start_times[agent.name] = time.time()
        print(_SEP_RED)
        print(_r(f"🚀 [AGENT HOOK] START ▶ {agent.name} (Session: {self.session_id})"))
        print(_SEP_RED)

    async def on_end(self, context, agent, output) -> None:
        duration = int((time.time() - self.start_times.get(agent.name, time.time())) * 1000)
        output_str = str(output)[:500] if output else "None"
        print(_SEP_RED)
        print(_r(f"✅ [AGENT HOOK] END ◀ {agent.name}  ({duration}ms)"))
        print(_r(f"   Output: {output_str}"))
        print(_SEP_RED)

    async def on_handoff(self, context, agent, source) -> None:
        print(_SEP_RED)
        print(_r(f"🔄 [AGENT HOOK] HANDOFF ◀ {agent.name} handed off from {source.name}"))
        print(_SEP_RED)

    async def on_tool_start(self, context, agent, tool) -> None:
        self.start_times[f"{agent.name}_{tool.name}"] = time.time()
        tool_args = getattr(context, "tool_arguments", None)
        args_str = str(tool_args)[:300] if tool_args else "(unavailable)"
        print(_SEP_RED)
        print(_r(f"🔧 [AGENT HOOK] TOOL START ▶ {tool.name}  (agent: {agent.name})"))
        print(_r(f"   Input: {args_str}"))
        print(_SEP_RED)

    async def on_tool_end(self, context, agent, tool, result) -> None:
        duration = int((time.time() - self.start_times.get(f"{agent.name}_{tool.name}", time.time())) * 1000)
        result_str = str(result)[:500]
        print(_SEP_RED)
        print(_r(f"✔️  [AGENT HOOK] TOOL END ◀ {tool.name}  (agent: {agent.name})  ({duration}ms)"))
        print(_r(f"   Result: {result_str}"))
        print(_SEP_RED)

    async def on_llm_start(self, context, agent, system_prompt, input_items) -> None:
        self.start_times[f"{agent.name}_llm"] = time.time()
        preview = system_prompt[:200] if system_prompt else "(none)"
        print(_SEP_RED)
        print(_r(f"🧠 [AGENT HOOK] LLM START ▶ {agent.name}"))
        print(_r(f"   System prompt ({len(system_prompt) if system_prompt else 0} chars): {preview}..."))
        print(_r(f"   Input items: {len(input_items)}"))
        print(_SEP_RED)

    async def on_llm_end(self, context, agent, response) -> None:
        duration = int((time.time() - self.start_times.get(f"{agent.name}_llm", time.time())) * 1000)
        response_text = response.text if hasattr(response, "text") else str(response)
        preview = response_text[:400] if response_text else "(empty)"
        print(_SEP_RED)
        print(_r(f"💬 [AGENT HOOK] LLM END ◀ {agent.name}  ({duration}ms)"))
        print(_r(f"   Response: {preview}"))
        print(_SEP_RED)
