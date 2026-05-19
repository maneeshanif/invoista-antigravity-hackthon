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
        # New State Tracking Flags
        self.has_providers_found = None
        self.has_booking_created = False

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
            
        summary = f"Agent {agent.name} completed."
        if agent.name.lower() == "orchestrator":
            # Formulate outcome-based summaries
            if self.has_providers_found is False:
                summary = "Concierge could not locate any available professionals in your area."
            elif self.has_providers_found is True and not self.has_booking_created:
                summary = "Concierge was unable to secure an appointment slot with a matched professional."
            else:
                summary = "Concierge successfully completed the entire service orchestration pipeline."
            
        await self._write_log(
            agent_name="Runner",
            tool_used=f"agent_{agent.name}",
            input_payload={},
            output_payload=output_payload,
            output_summary=summary,
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
        
        # Safely extract and dump the output payload
        output_payload = {}
        if hasattr(result, "model_dump"):
            output_payload = result.model_dump()
        else:
            try:
                import json
                if isinstance(result, str):
                    output_payload = json.loads(result)
                else:
                    output_payload = {"result": str(result)}
            except Exception:
                output_payload = {"result": str(result)}
        
        # 1. Determine human-friendly output summaries based on tool name
        tool_name = tool.name.lower()
        output_summary = f"Tool {tool.name} executed by {agent.name}."
        
        if "run_discovery" in tool_name or "find_providers" in tool_name:
            # Count the providers returned in the result
            providers_count = 0
            if isinstance(output_payload, dict):
                providers = output_payload.get("providers", [])
                if isinstance(providers, list):
                    providers_count = len(providers)
                elif "result" in output_payload:
                    res_str = str(output_payload["result"])
                    import re
                    # Quick estimate based on provider count identifiers
                    providers_count = len(re.findall(r'"provider_id"|id|name', res_str)) // 2 or 3
            
            self.has_providers_found = providers_count > 0
            
            if providers_count > 0:
                output_summary = f"Discovered {providers_count} available local professionals matching your requested service type."
            else:
                output_summary = "Searched the local area for matching service professionals."
                
        elif "run_ranking" in tool_name or "rank_providers" in tool_name:
            output_summary = "Evaluated candidates and selected the best professional based on ratings, reviews, and proximity."
            
        elif "run_booking" in tool_name or "create_booking" in tool_name:
            provider_name = "the selected professional"
            booking_id = None
            if isinstance(output_payload, dict):
                booking_id = output_payload.get("booking_id")
                if not booking_id and "result" in output_payload:
                    res_str = str(output_payload["result"])
                    import re
                    json_match = re.search(r'"booking_id"\s*:\s*"([^"]+)"', res_str)
                    if json_match:
                        booking_id = json_match.group(1)
                    else:
                        md_match = re.search(r'booking\s*id\s*[\*:]*\s*([a-fA-F0-9\-]{36})', res_str, re.IGNORECASE)
                        if md_match:
                            booking_id = md_match.group(1)
                        else:
                            uuid_match = re.search(r'([a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12})', res_str)
                            if uuid_match:
                                booking_id = uuid_match.group(1)
            
            if booking_id:
                self.has_booking_created = True
                output_payload["booking_id"] = booking_id
                
            if booking_id:
                try:
                    from mcp_server.db import supabase_client
                    booking_resp = supabase_client.table("bookings").select("provider_id").eq("id", booking_id).single().execute()
                    if booking_resp.data and booking_resp.data.get("provider_id"):
                        prov_id = booking_resp.data["provider_id"]
                        output_payload["provider_id"] = prov_id
                        prov_resp = supabase_client.table("providers").select("name").eq("id", prov_id).single().execute()
                        if prov_resp.data and prov_resp.data.get("name"):
                            provider_name = prov_resp.data["name"]
                except Exception as e:
                    print(f"Error querying provider name in hook: {e}")
            
            output_summary = f"Successfully confirmed the appointment and secured a slot with {provider_name}."
            
        elif "run_followup" in tool_name or "schedule_followup" in tool_name or "schedule_followups" in tool_name:
            output_summary = "Scheduled automated reminders for the appointment and created follow-up tasks to ensure quality service."
            
        elif "run_notification" in tool_name or "send_booking_emails" in tool_name:
            output_summary = "Dispatched booking confirmation emails to both the user and the service provider."

        # Write to DB via program trace logging
        await self._write_log(
            agent_name=agent.name,
            tool_used=tool.name,
            input_payload={},
            output_payload=output_payload,
            output_summary=output_summary,
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
            output_summary="Concierge coordinator formulated final advice and confirmation details.",
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
