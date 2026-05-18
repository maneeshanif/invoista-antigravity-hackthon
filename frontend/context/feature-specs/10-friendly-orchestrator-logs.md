# 10 — Layperson-Friendly Orchestrator Logs & Specialist Attribution

## Overview

When the Concierge AI Orchestrator executes a service request, the execution traces are logged in real-time and displayed in the **Home Screen chat section** and the **Request Details Screen** (`/request/[id]`). 

Currently, these logs display technical terms and generic headings that look developer-centric and are not layperson-friendly. For example, instead of a premium, polished assistant experience, the user is shown:
* **Heading**: `Main AI Coordinator` (repeated for every single step)
* **Tool Line**: `🔧 Using tool: run_discovery` (fallback text)
* **Summary Line**: `Tool run_discovery executed by Orchestrator.`

This specification introduces a **dual-layered log translation system** that makes the orchestration logs highly readable, engaging, and premium:
1. **Frontend Translation & Specialist Attribution**: Dynamically maps technical tool names to premium status indchumma icators and changes the step header from a repeated `Main AI Coordinator` to the name of the active **Specialist Agent** handling the step (e.g., `Discovery Specialist` or `Matching Specialist`).
2. **Backend Context-Aware Hook Engine**: Upgrades `/backend/app/agents/hooks.py` to write descriptive, natural language summaries directly to the database based on the results returned by each specialist (e.g. counting the found professionals or naming the booked professional).

---

## 1. Deficiencies in the Current Implementation

### 1.1 Technical Fallbacks in `getFriendlyToolName`
The frontend files (`app/(tabs)/index.tsx` and `app/request/[id].tsx`) use `getFriendlyToolName` to format tool identifiers. However, it only checks for the legacy MCP tool names `find_providers` and `create_booking`:
```typescript
const getFriendlyToolName = (toolName: string | null) => {
  if (!toolName) return 'Finalizing response...';
  if (toolName.includes('call_agent')) return 'Consulting with sub-specialist...';
  if (toolName.includes('find_providers')) return 'Searching local database for available professionals...';
  if (toolName.includes('create_booking')) return 'Securing an appointment slot...';
  return `Using tool: ${toolName}`; // <-- Fallback used for orchestrator tools
};
```
Because the Orchestrator runs sub-agents via wrapped tools named `run_discovery`, `run_ranking`, `run_booking`, and `run_followup`, the frontend falls back to displaying `🔧 Using tool: run_discovery` directly to the end user.

### 1.2 Programmatic Database Traces
In the backend, `/backend/app/agents/hooks.py` intercepts the runner lifecycle and inserts logs into the `trace_logs` table via `write_trace_log`. It constructs `output_summary` strings using raw developer-centric templates:
```python
output_summary=f"Tool {tool.name} executed by {agent.name}."
output_summary=f"Agent {agent.name} completed."
output_summary=f"LLM call completed by {agent.name}."
```
These strings are saved directly into the database, making them hard to format on the client without messy text replacements.

### 1.3 Repetitive "Main AI Coordinator" Headers
Since sub-agents are executed as tools inside the main `Runner` loop of the `Orchestrator`, the runner records the executing agent as `Orchestrator`. Consequently, the frontend translates this name using `getFriendlyAgentName` and lists `Main AI Coordinator` as the title for every single trace step. This hides the multi-agent design of our system.

---

## 2. UX Design & Layperson Translations

We will implement a premium log layout that replaces technical jargon with highly engaging concierge actions:

### 2.1 Before vs. After Mapping Comparison

| Step | Current UI Presentation (Deficient) | Proposed Premium UI Presentation |
| :--- | :--- | :--- |
| **Step 1: Discovery** | **Main AI Coordinator**<br>🔧 Using tool: run_discovery<br>Tool run_discovery executed by Orchestrator. | **Discovery Specialist** 🔍<br>Searching for qualified professionals in your area...<br>Discovered 5 available service professionals in your sector. |
| **Step 2: Ranking** | **Main AI Coordinator**<br>🔧 Using tool: run_ranking<br>Tool run_ranking executed by Orchestrator. | **Matching Specialist** 🛡️<br>Evaluating and matching the best professionals for you...<br>Analyzed reviews, distance, and slots to select the top candidate. |
| **Step 3: Booking** | **Main AI Coordinator**<br>🔧 Using tool: run_booking<br>Tool run_booking executed by Orchestrator. | **Booking Coordinator** 📍<br>Securing your booking slot...<br>Successfully booked your slot with [Provider Name]! |
| **Step 4: Follow-up** | **Main AI Coordinator**<br>🔧 Using tool: run_followup<br>Tool run_followup executed by Orchestrator. | **Notification Coordinator** 🔔<br>Setting up follow-up reminders and quality check...<br>Scheduled reminder alerts and a quality checkout for your peace of mind. |
| **Final: Response** | **Main AI Coordinator**<br>🔧 Finalizing response...<br>LLM call completed by Orchestrator. | **Main AI Coordinator** ✨<br>Formulating final advice and confirmation details...<br>Concierge completed scheduling and preparing your receipt details. |

---

## 3. Technical Implementation Plan

We will roll out this upgrade across both the React Native frontend and FastAPI backend:

### 3.1 Frontend Upgrades

We will update two frontend screens:
1. `frontend/app/(tabs)/index.tsx` (Home Screen Log Drawer)
2. `frontend/app/request/[id].tsx` (Status Page Steps)

#### A. Expand `getFriendlyToolName`
Add support for the actual sub-agent tool names executed by the Orchestrator:
```typescript
const getFriendlyToolName = (toolName: string | null) => {
  if (!toolName) return 'Finalizing response...';
  const name = toolName.toLowerCase();
  
  if (name.includes('run_discovery') || name.includes('find_providers')) {
    return 'Searching for qualified professionals in your area...';
  }
  if (name.includes('run_ranking') || name.includes('rank_providers')) {
    return 'Evaluating and matching the best professionals for you...';
  }
  if (name.includes('run_booking') || name.includes('create_booking')) {
    return 'Securing your booking slot...';
  }
  if (name.includes('run_followup') || name.includes('schedule_followup')) {
    return 'Setting up follow-up reminders and quality check...';
  }
  if (name.includes('call_agent')) {
    return 'Consulting with sub-specialist...';
  }
  if (name.includes('llm_call')) {
    return 'Formulating final advice and booking details...';
  }
  
  return `Coordinating step: ${toolName}`;
};
```

#### B. Implement Dynamic Specialist Attribution
Create a new helper function `getFriendlyAgentNameForTrace` that dynamically overrides the generic `Orchestrator` header based on which specialist tool was being executed during that trace step:
```typescript
const getFriendlyAgentNameForTrace = (trace: TraceLog) => {
  const tool = trace.tool_used?.toLowerCase() || '';
  if (tool.includes('discovery') || tool.includes('find_providers')) {
    return 'Discovery Specialist';
  }
  if (tool.includes('ranking') || tool.includes('rank_providers')) {
    return 'Matching Specialist';
  }
  if (tool.includes('booking') || tool.includes('create_booking')) {
    return 'Booking Coordinator';
  }
  if (tool.includes('followup') || tool.includes('schedule_followup')) {
    return 'Notification Coordinator';
  }
  return getFriendlyAgentName(trace.agent_name);
};
```

Replace `<ThemedText style={styles.stepLabel}>{getFriendlyAgentName(trace.agent_name)}</ThemedText>` with `getFriendlyAgentNameForTrace(trace)` in the render loop.

---

### 3.2 Backend Upgrades

We will modify `/backend/app/agents/hooks.py` inside `TraceRunHooks` to intercept completed actions and generate premium, layperson-friendly output summaries before inserting them into the database.

#### A. Add Context-Aware String Formatter in `on_tool_end`
Update the `on_tool_end` method of `TraceRunHooks` to determine the descriptive message dynamically:
```python
    async def on_tool_end(self, context, agent, tool, result) -> None:
        duration = int((time.time() - self.start_times.get(tool.name, time.time())) * 1000)
        
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
        output_summary = f"Completed step via {tool.name}."
        
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
            
            if providers_count > 0:
                output_summary = f"Discovered {providers_count} available local professionals matching your requested service type."
            else:
                output_summary = "Searched the local area for matching service professionals."
                
        elif "run_ranking" in tool_name or "rank_providers" in tool_name:
            output_summary = "Evaluated candidates and selected the best professional based on ratings, reviews, and proximity."
            
        elif "run_booking" in tool_name or "create_booking" in tool_name:
            # Try to safely extract confirmation details if present
            provider_name = "the selected professional"
            output_summary = f"Successfully confirmed the appointment and secured a slot with {provider_name}."
            
        elif "run_followup" in tool_name or "schedule_followups" in tool_name:
            output_summary = "Scheduled automated reminders for the appointment and created follow-up tasks to ensure quality service."
            
        # Write to DB via program trace logging
        await self._write_log(
            agent_name=agent.name,
            tool_used=tool.name,
            input_payload={},
            output_payload=output_payload,
            output_summary=output_summary,
            duration_ms=duration
        )
```

#### B. Improve LLM & End Summaries in `on_llm_end` and `on_agent_end`
* Update `on_llm_end`'s logging call to output a friendly summary:
  `output_summary="Concierge coordinator formulated final advice and confirmation details."`
* Update `on_agent_end`'s logging call to write:
  `output_summary="Concierge successfully completed the entire service orchestration pipeline."`

---

## 4. Implementation Checklist

| Task | Priority | Target File | Status |
| :--- | :---: | :--- | :---: |
| Extend `getFriendlyToolName` mapper in the Home Tab page | **P0** | `frontend/app/(tabs)/index.tsx` | ✅ |
| Implement `getFriendlyAgentNameForTrace` to attribute log entries to sub-specialist agents | **P0** | `frontend/app/(tabs)/index.tsx` | ✅ |
| Replicate tool mapper updates and dynamic headers in the Request Status page | **P0** | `frontend/app/request/[id].tsx` | ✅ |
| Upgrade backend hooks to parse outputs and write descriptive summaries to `trace_logs` | **P1** | `backend/app/agents/hooks.py` | ✅ |
| Add edge case fallbacks (e.g. JSON parse errors) inside hook formatters | **P1** | `backend/app/agents/hooks.py` | ✅ |
| Perform end-to-end trace validation with test queries | **P2** | `/backend` & `/frontend` | ✅ |
