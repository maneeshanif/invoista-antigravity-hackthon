import time
import asyncio
from typing import Any

from agents.lifecycle import RunHooksBase, AgentHooksBase

from mcp_server.tools.trace_tools import write_trace_log, WriteTraceLogInput


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
        print(f"🚦 Runner: on_agent_start for {agent.name}")

    async def on_agent_end(self, context, agent, output) -> None:
        duration = int((time.time() - self.start_times.get(agent.name, time.time())) * 1000)
        print(f"🏁 Runner: on_agent_end for {agent.name} after {duration}ms")
        
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
        print(f"🔀 Runner: on_handoff from {from_agent.name} to {to_agent.name}")
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
        print(f"🛠️ Runner: on_tool_start for tool {tool.name} by {agent.name}")

    async def on_tool_end(self, context, agent, tool, result) -> None:
        duration = int((time.time() - self.start_times.get(tool.name, time.time())) * 1000)
        print(f"✅ Runner: on_tool_end for tool {tool.name} by {agent.name} after {duration}ms")
        
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
        print(f"🧠 Runner: on_llm_start by {agent.name}")

    async def on_llm_end(self, context, agent, response) -> None:
        duration = int((time.time() - self.start_times.get(f"llm_{agent.name}", time.time())) * 1000)
        print(f"📝 Runner: on_llm_end by {agent.name} after {duration}ms")
        
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
        print(f"🟢 Agent {agent.name} started in session {self.session_id}")

    async def on_end(self, context, agent, output) -> None:
        duration = int((time.time() - self.start_times.get(agent.name, time.time())) * 1000)
        print(f"🛑 Agent {agent.name} ended in session {self.session_id} after {duration}ms")

    async def on_handoff(self, context, agent, source) -> None:
        print(f"🔄 Agent {agent.name} handed off from {source.name} in session {self.session_id}")

    async def on_tool_start(self, context, agent, tool) -> None:
        self.start_times[f"{agent.name}_{tool.name}"] = time.time()
        print(f"⚙️ Agent {agent.name} started tool {tool.name} in session {self.session_id}")

    async def on_tool_end(self, context, agent, tool, result) -> None:
        duration = int((time.time() - self.start_times.get(f"{agent.name}_{tool.name}", time.time())) * 1000)
        print(f"🔧 Agent {agent.name} ended tool {tool.name} in session {self.session_id} after {duration}ms")

    async def on_llm_start(self, context, agent, system_prompt, input_items) -> None:
        self.start_times[f"{agent.name}_llm"] = time.time()
        print(f"🤖 Agent {agent.name} started LLM call in session {self.session_id}")

    async def on_llm_end(self, context, agent, response) -> None:
        duration = int((time.time() - self.start_times.get(f"{agent.name}_llm", time.time())) * 1000)
        print(f"📋 Agent {agent.name} ended LLM call in session {self.session_id} after {duration}ms")
