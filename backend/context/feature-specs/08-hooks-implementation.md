# Hooks Implementation (OpenAI Agents SDK)

This specification details the implementation of OpenAI Agents SDK lifecycle hooks for the AI Service Marketplace. The primary goal of these hooks is to record comprehensive **Trace Logs** of the agent workflows to fulfill the core requirement of "Trace log visibility" as outlined in the project overview.

## Overview

The `agents.lifecycle` module in the OpenAI Agents SDK provides callbacks during the execution of agents. We need to intercept these events to log inputs, outputs, timestamps, and tool usage to the `TRACE_LOGS` table in Supabase.

We will implement:
- **RunHooks (`RunHooksBase`)**: Captures workflow-level events globally during the `Runner.run()` execution.
- **AgentHooks (`AgentHooksBase`)**: Captures events specific to a single agent (can be attached to `agent.hooks`).

## Implementation Details

### 1. Create Hook Classes
   - Create a new file: `app/agents/hooks.py` (or implement within `orchestrator.py`).
   - Define a class `TraceRunHooks` that inherits from `RunHooksBase`.
   - Define a class `TraceAgentHooks` that inherits from `AgentHooksBase`.
   - Both classes need to track the start times of agents, LLMs, and tools to calculate `duration_ms`.

### 2. Methods to Override in `TraceRunHooks` (Runner Hooks)
   - 🚦 `on_agent_start(context, agent)`: Record the timestamp when an agent begins.
   - 🏁 `on_agent_end(context, agent, output)`: Calculate agent execution duration. Log the agent completion.
   - 🔀 `on_handoff(context, from_agent, to_agent)`: Record when the orchestrator hands off to a sub-agent.
   - 🛠️ `on_tool_start(context, agent, tool)`: Record when a tool execution starts (including tool name and arguments).
   - ✅ `on_tool_end(context, agent, tool, result)`: Calculate tool execution duration. Send a complete trace log containing the tool name, `input_payload`, `output_payload`/`result`, and `duration_ms`.
   - 🧠 `on_llm_start(context, agent, system_prompt, input_items)`: Record LLM call start.
   - 📝 `on_llm_end(context, agent, response)`: Record LLM call completion and token usage/duration if necessary.

### 3. Methods to Override in `TraceAgentHooks` (Agent Hooks)
   - 🟢 `on_start(context, agent)`: Called before the specific agent is invoked.
   - 🛑 `on_end(context, agent, output)`: Called when the specific agent produces a final output.
   - 🔄 `on_handoff(context, agent, source)`: Called when the agent is being handed off to (source is the agent handing off).
   - ⚙️ `on_tool_start(context, agent, tool)`: Called right before a local tool is invoked by this agent.
   - 🔧 `on_tool_end(context, agent, tool, result)`: Called right after a local tool is invoked by this agent.
   - 🤖 `on_llm_start(context, agent, system_prompt, input_items)`: Called immediately before the agent issues an LLM call.
   - 📋 `on_llm_end(context, agent, response)`: Called immediately after the LLM call returns for this agent.

### 4. Writing to Database
   - According to the architecture (`architecture-context.md`), trace logs should be written using the MCP server tool `write_trace_log` or directly via Supabase if more efficient from the orchestrator context. 
   - Ensure `session_id` is passed correctly so all trace logs are associated with the current user session. You may store `session_id` and an internal `step` counter as state within the hook instances.

### 5. Integration with Runner and Agents
   - In `app/agents/orchestrator.py`, instantiate `TraceRunHooks(session_id=current_session_id)`.
   - Pass the `RunHooks` to the `Runner.run()` via `RunConfig(hooks=[trace_run_hooks])` (or equivalent syntax).
   - Instantiate `TraceAgentHooks` and attach it to individual agents (e.g., `discovery_agent.hooks = [TraceAgentHooks(...)]`) if per-agent granular tracing is needed beyond the Runner level.

## Example Structure

```python
from agents.lifecycle import RunHooksBase, AgentHooksBase
import time

class TraceRunHooks(RunHooksBase):
    def __init__(self, session_id: str, mcp_client):
        self.session_id = session_id
        self.mcp_client = mcp_client
        self.step_counter = 1
        self.start_times = {}

    async def on_tool_start(self, context, agent, tool):
        self.start_times[tool.name] = time.time()
        # Track input arguments

    async def on_tool_end(self, context, agent, tool, result):
        duration = int((time.time() - self.start_times.get(tool.name, time.time())) * 1000)
        # Call write_trace_log MCP tool or DB directly
        # Increment self.step_counter

class TraceAgentHooks(AgentHooksBase):
    def __init__(self, session_id: str):
        self.session_id = session_id

    async def on_start(self, context, agent):
        print(f"Agent {agent.name} started in session {self.session_id}")
```

## Dependencies
- `agents.lifecycle` from `openai-agents-python` SDK.
- The `mcp_client` to invoke the `write_trace_log` tool (or Supabase client).

## Check When Done
- `TraceRunHooks` is defined and implements `RunHooksBase`.
- `TraceAgentHooks` is defined and implements `AgentHooksBase`.
- The orchestrator runner integrates the `TraceRunHooks` correctly.
- Individual agents integrate `TraceAgentHooks` correctly.
- Agent and tool executions are successfully generating rows in the `TRACE_LOGS` table in Supabase.
- Each trace log accurately reflects `session_id`, `step`, `agent_name`, `tool_used`, payload, and `duration_ms`.
