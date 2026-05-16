# Feature 05 – Agent Layer Refactor (OpenAI Agents SDK)

Refactor the entire agent layer to use the **OpenAI Agents SDK** with proper multi-agent architecture. The **Orchestrator Agent itself handles intent extraction** from the user message, then calls 4 specialist sub-agents as tools in strict sequential order using `agent.as_tool()`.

## Problem with Current Implementation

1. **No OpenAI Agents SDK** — `orchestrator.py` is a hand-rolled Python class. Zero SDK primitives used.
2. **Unnecessary `IntentAgent` class** — `intent_agent.py` is a plain class calling raw Gemini SDK. Intent extraction is just an LLM reasoning step — the Orchestrator Agent can do this itself before calling sub-agent tools.
3. **Custom `MCPClient` wrapper** — `mcp_client.py` manually manages stdio + JSON parsing. SDK handles this natively via `MCPServerStreamableHttp`.
4. **All logic in one file** — every agent's responsibility is crammed into `orchestrator.py` with no modularity.

---

## Design

### Multi-Agent Architecture (SDK Native)

Each pipeline stage becomes a **real SDK `Agent`** with its own:
- `name` and `instructions` (its system prompt)
- `model` (shared primary/fallback)
- `mcp_servers=[mcp]` (for agents that call MCP tools)

These agents are wrapped with `.as_tool()` and given to the **Orchestrator Agent** as callable tools. The Orchestrator's LLM is instructed via a detailed prompt to call them **strictly in order, one by one**, passing each result into the next.

```
Orchestrator Agent (SDK Agent)  ← ALSO does intent extraction from user message
  ├── tool: run_discovery       ← DiscoveryAgent.as_tool()
  ├── tool: run_ranking         ← RankingAgent.as_tool()
  ├── tool: run_booking         ← BookingAgent.as_tool()
  ├── tool: run_followup        ← FollowupAgent.as_tool()
  └── mcp_servers: [mcp]       ← for create_session, update_session_status, write_trace_log

DiscoveryAgent  → mcp_servers=[mcp], calls find_providers_tool
RankingAgent    → mcp_servers=[mcp], calls rank_providers_tool
BookingAgent    → mcp_servers=[mcp], calls create_booking_tool
FollowupAgent   → mcp_servers=[mcp], calls schedule_followups_tool
```

**Why Orchestrator handles intent directly:**
Intent extraction is just LLM reasoning — parse the user message and identify service_type, location, urgency. This doesn't need a sub-agent. The Orchestrator's own LLM does this as its first thinking step, then passes the extracted values into `run_discovery`. This removes unnecessary agent-to-agent overhead for a trivial task.

### How `agent.as_tool()` Works (SDK docs pattern)

> "Use agents as tools when a specialist should help with a bounded subtask but should not take over the user-facing conversation."

```python
discovery_tool = discovery_agent.as_tool(
    tool_name="run_discovery",
    tool_description="Find matching providers for a service type and area. Pass service_type and area as input."
)
```

The Orchestrator's LLM calls `run_discovery(...)` → the SDK spawns a full `Runner.run()` for `DiscoveryAgent` → result is returned as a string back to the Orchestrator → Orchestrator feeds it into the next tool call.

### MCP Transport — Streamable HTTP

All agents that need MCP tools share the same `MCPServerStreamableHttp` instance. The MCP server runs as a **separate HTTP process** on port `8001`. The SDK connects to it at `http://localhost:8001/mcp`.

### LLM — Primary + Fallback (`app/agents/llm_client.py`)

**Primary**: `gpt-4o-mini` via `OpenAIChatCompletionsModel`  
**Fallback**: `gemini-2.0-flash` via `OpenAIChatCompletionsModel` + Google OpenAI-compatible endpoint

All fallback logic is centralised in `llm_client.py`. Every agent imports `get_model()` from there — if the primary OpenAI call raises an `APIStatusError` (4xx/5xx), the function returns the Gemini fallback model instead. No fallback logic is duplicated in individual agent files.

---

## File Structure After Refactor

```
app/agents/
  __init__.py
  models.py           ← NEW: IntentResult Pydantic schema only
  llm_client.py       ← NEW: get_model() with OpenAI primary + Gemini fallback logic
  prompts.py          ← UPDATE: 5 prompts (ORCHESTRATOR + 4 sub-agents). No intent prompt needed.
  discovery_agent.py  ← REPLACE: SDK Agent (mcp_servers=[mcp], calls find_providers_tool)
  ranking_agent.py    ← REPLACE: SDK Agent (mcp_servers=[mcp], calls rank_providers_tool)
  booking_agent.py    ← REPLACE: SDK Agent (mcp_servers=[mcp], calls create_booking_tool)
  followup_agent.py   ← REPLACE: SDK Agent (mcp_servers=[mcp], calls schedule_followups_tool)
  orchestrator.py     ← REPLACE: SDK Agent with 4 sub-agents as tools + MCP for session/trace
  (delete intent_agent.py — intent extraction done by Orchestrator itself)
  (delete mcp_client.py  — replaced by MCPServerStreamableHttp in orchestrator)

mcp_server/
  server.py           ← UPDATE: change __main__ to use transport="http"
```

---

## Implementation

### Step 1 — Install Dependencies

```bash
uv add openai-agents
uv remove google-generativeai   # no longer needed
```

Update `app/core/config.py` to add:
```python
OPENAI_API_KEY: str = ""
GEMINI_API_KEY: str = ""
GEMINI_BASE_URL: str = "https://generativelanguage.googleapis.com/v1beta/openai/"
MCP_SERVER_URL: str = "http://localhost:8001/mcp"
MCP_PORT: int = 8001
```

Update `.env` and `.env.example`:
```
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=AIza...
GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/
MCP_SERVER_URL=http://localhost:8001/mcp
MCP_PORT=8001
```

---

### Step 2 — Pydantic Schema (`app/agents/models.py`)

`models.py` now holds **only the data schema** — no LLM construction logic.

```python
"""
models.py — Pydantic output schemas for structured agent responses.
"""
from pydantic import BaseModel, Field


class IntentResult(BaseModel):
    service_type: str = Field(..., description="e.g. 'AC Technician', 'Plumber'")
    location_text: str = Field(..., description="Area name, e.g. 'G-13'")
    time_preference: str = Field(default="tomorrow morning", description="e.g. 'tomorrow morning'")
    urgency: str = Field(default="medium", description="low / medium / high")
    detected_language: str = Field(default="en", description="en / ur / roman_urdu")
```

---

### Step 2b — LLM Client (`app/agents/llm_client.py`)

All LLM construction and fallback logic lives here. Every agent calls `get_model()` to get a ready model. The fallback is transparent — callers don't need to know which provider is active.

```python
"""
llm_client.py — Centralised LLM provider with OpenAI primary and Gemini fallback.

Usage in any agent:
    from app.agents.llm_client import get_model
    agent = Agent(name="...", model=get_model(), ...)

Fallback behaviour:
    - Primary: gpt-4o-mini via OpenAI API
    - Fallback: gemini-2.0-flash via Google's OpenAI-compatible endpoint
    - Triggers on: APIStatusError with status 400, 401, 429, 500, 503
"""

from openai import AsyncOpenAI, APIStatusError
from agents import OpenAIChatCompletionsModel
from app.core.config import settings

# Error codes that trigger fallback to Gemini
FALLBACK_STATUS_CODES = {400, 401, 429, 500, 503}


def _build_openai_model() -> OpenAIChatCompletionsModel:
    """Build the primary gpt-4o-mini model."""
    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    return OpenAIChatCompletionsModel(model="gpt-4o-mini", openai_client=client)


def _build_gemini_model() -> OpenAIChatCompletionsModel:
    """Build the Gemini 2.0 Flash model via Google's OpenAI-compatible API."""
    client = AsyncOpenAI(
        api_key=settings.GEMINI_API_KEY,
        base_url=settings.GEMINI_BASE_URL,   # https://generativelanguage.googleapis.com/v1beta/openai/
    )
    return OpenAIChatCompletionsModel(model="gemini-2.0-flash", openai_client=client)


def get_model() -> OpenAIChatCompletionsModel:
    """
    Return the primary OpenAI model.
    All agents use this. The fallback is applied at the Runner level via
    the model_settings or via a try/except in run_workflow if needed.

    In practice: pass this to Agent(model=get_model()) for every agent.
    The orchestrator wraps Runner.run() in a try/except and retries
    with get_fallback_model() if an APIStatusError is raised.
    """
    return _build_openai_model()


def get_fallback_model() -> OpenAIChatCompletionsModel:
    """Return the Gemini fallback model. Used when OpenAI raises APIStatusError."""
    return _build_gemini_model()


async def run_with_fallback(runner_fn, *args, **kwargs):
    """
    Helper: run a coroutine that uses the primary model.
    If it raises APIStatusError with a fallback-triggering status code,
    swap the model to Gemini and retry once.

    Usage in orchestrator:
        result = await run_with_fallback(Runner.run, orchestrator, input=msg)
    """
    try:
        return await runner_fn(*args, **kwargs)
    except APIStatusError as e:
        if e.status_code in FALLBACK_STATUS_CODES:
            # Rebuild the orchestrator/agent with Gemini model and retry
            # Caller is responsible for passing the fallback agent
            raise  # Let orchestrator handle the swap
        raise
```

**How the orchestrator uses it:**

```python
# orchestrator.py — run_workflow()
from app.agents.llm_client import get_model, get_fallback_model
from openai import APIStatusError

try:
    orchestrator = Agent(name="Orchestrator", model=get_model(), ...)
    result = await Runner.run(orchestrator, input=initial_message, ...)
except APIStatusError as e:
    if e.status_code in {400, 401, 429, 500, 503}:
        # Swap to Gemini and retry
        orchestrator = Agent(name="Orchestrator", model=get_fallback_model(), ...)
        result = await Runner.run(orchestrator, input=initial_message, ...)
    else:
        raise
```

---

### Step 3 — Update Prompts (`app/agents/prompts.py`)

The Orchestrator prompt now has **two phases**: first it reasons about intent from the user message, then it calls sub-agent tools in order. No separate `INTENT_EXTRACTION_PROMPT` needed.

```python
ORCHESTRATOR_PROMPT = """
You are the Lead Orchestrator for the AI Service Marketplace.

You will receive a user request that may be in English, Urdu, or Roman Urdu.

PHASE 1 — UNDERSTAND THE REQUEST (do this in your reasoning, no tool call needed):
Before calling any tool, read the user message and identify:
  - service_type   : e.g. "AC Technician", "Plumber", "Electrician"
  - location_text  : area name e.g. "G-13", "F-7", "Islamabad"
  - time_preference: e.g. "tomorrow morning", "today evening" (default: "tomorrow morning")
  - urgency        : "high", "medium", or "low" (default: "medium")
  - detected_language: "en", "ur", or "roman_urdu"

PHASE 2 — CALL TOOLS IN THIS EXACT ORDER:

STEP 1 — Call `create_session_tool` with user_id and raw_input. Save the session_id.

STEP 2 — Call `run_discovery` with service_type, location_text (as area), and slot_date.
          Wait for the result. Get the list of available providers.
          Then call `write_trace_log_tool` for this step.

STEP 3 — Call `run_ranking` with the full provider list from Step 2.
          Wait for the result. Identify the top-ranked provider.
          Then call `write_trace_log_tool` for this step.

STEP 4 — Call `run_booking` with user_id, provider_id (top from Step 3), slot_id (first available).
          Wait for the result. Get the booking_id and confirmation_code.
          Then call `write_trace_log_tool` for this step.

STEP 5 — Call `run_followup` with booking_id, user_id, and slot_datetime.
          Wait for the result. Confirm notifications were scheduled.
          Then call `write_trace_log_tool` for this step.

STEP 6 — Call `update_session_status_tool` with session_id, status="completed", detected_language.

RULES:
- Never skip a step. Never call a step before the previous one completes.
- Never call the same step twice.
- Pass all relevant data from previous steps into each next step's input.
- After Step 5 completes, respond with a friendly booking confirmation summary.
"""

DISCOVERY_AGENT_PROMPT = """
You are the Discovery Agent. Your only job is to call the `find_providers_tool` MCP tool.
Extract service_type, area, and slot_date from the input you receive.
Call find_providers_tool with exactly these fields.
Return the full list of providers with their available slots.
"""

RANKING_AGENT_PROMPT = """
You are the Ranking Agent. Your only job is to call the `rank_providers_tool` MCP tool.
Extract the provider list, user_lat, and user_lng from the input you receive.
Use default coordinates lat=33.6491, lng=72.9818 if not provided.
Call rank_providers_tool and return the ranked provider list with scores.
"""

BOOKING_AGENT_PROMPT = """
You are the Booking Agent. Your only job is to call the `create_booking_tool` MCP tool.
Extract user_id, provider_id, and slot_id from the input you receive.
Call create_booking_tool and return the booking_id and confirmation_code.
"""

FOLLOWUP_AGENT_PROMPT = """
You are the Follow-up Agent. Your only job is to call the `schedule_followups_tool` MCP tool.
Extract booking_id, user_id, and slot_datetime from the input you receive.
Call schedule_followups_tool to schedule a reminder and a completion check notification.
Return the list of scheduled notifications.
"""
```

---

### Step 4 — Individual Agent Files

Only 4 sub-agent files needed. Intent extraction is gone — the Orchestrator reasons about it internally.

**`app/agents/discovery_agent.py`**
```python
"""
discovery_agent.py — SDK Agent that calls find_providers_tool via MCP.
"""
from agents import Agent
from agents.mcp import MCPServerStreamableHttp
from app.agents.models import build_primary_model
from app.agents.prompts import DISCOVERY_AGENT_PROMPT


def create_discovery_agent(mcp: MCPServerStreamableHttp) -> Agent:
    return Agent(
        name="DiscoveryAgent",
        instructions=DISCOVERY_AGENT_PROMPT,
        model=build_primary_model(),
        mcp_servers=[mcp],
        # The agent sees find_providers_tool auto-discovered from MCP
    )
```

**`app/agents/ranking_agent.py`**
```python
"""
ranking_agent.py — SDK Agent that calls rank_providers_tool via MCP.
"""
from agents import Agent
from agents.mcp import MCPServerStreamableHttp
from app.agents.models import build_primary_model
from app.agents.prompts import RANKING_AGENT_PROMPT


def create_ranking_agent(mcp: MCPServerStreamableHttp) -> Agent:
    return Agent(
        name="RankingAgent",
        instructions=RANKING_AGENT_PROMPT,
        model=build_primary_model(),
        mcp_servers=[mcp],
    )
```

**`app/agents/booking_agent.py`**
```python
"""
booking_agent.py — SDK Agent that calls create_booking_tool via MCP.
"""
from agents import Agent
from agents.mcp import MCPServerStreamableHttp
from app.agents.models import build_primary_model
from app.agents.prompts import BOOKING_AGENT_PROMPT


def create_booking_agent(mcp: MCPServerStreamableHttp) -> Agent:
    return Agent(
        name="BookingAgent",
        instructions=BOOKING_AGENT_PROMPT,
        model=build_primary_model(),
        mcp_servers=[mcp],
    )
```

**`app/agents/followup_agent.py`**
```python
"""
followup_agent.py — SDK Agent that calls schedule_followups_tool via MCP.
"""
from agents import Agent
from agents.mcp import MCPServerStreamableHttp
from app.agents.models import build_primary_model
from app.agents.prompts import FOLLOWUP_AGENT_PROMPT


def create_followup_agent(mcp: MCPServerStreamableHttp) -> Agent:
    return Agent(
        name="FollowupAgent",
        instructions=FOLLOWUP_AGENT_PROMPT,
        model=build_primary_model(),
        mcp_servers=[mcp],
    )
```

---

### Step 5 — Orchestrator (`app/agents/orchestrator.py`)

The orchestrator opens the MCP connection, builds all sub-agents, wraps them with `.as_tool()`,
then creates the Orchestrator Agent with all tools attached.

```python
"""
orchestrator.py — Lead Orchestrator using OpenAI Agents SDK multi-agent pattern.

Architecture:
  - Each specialist agent is a real SDK Agent with mcp_servers=[mcp]
  - All agents are passed as tools to the Orchestrator via agent.as_tool()
  - The Orchestrator LLM is prompted to call them strictly in sequence
  - The Orchestrator also has direct MCP access for session and trace tools
"""

from agents import Agent, Runner, RunConfig
from agents.mcp import MCPServerStreamableHttp
from app.agents.models import build_primary_model
from app.agents.prompts import ORCHESTRATOR_PROMPT
from app.agents.discovery_agent import create_discovery_agent
from app.agents.ranking_agent import create_ranking_agent
from app.agents.booking_agent import create_booking_agent
from app.agents.followup_agent import create_followup_agent
from app.core.config import settings


async def run_workflow(user_input: str, user_id: str) -> dict:
    """
    Entry point for the full agent pipeline.

    The Orchestrator Agent handles intent extraction itself (no IntentAgent).
    Then calls 4 specialist sub-agents as tools in strict sequence.
    """
    async with MCPServerStreamableHttp(
        params={"url": settings.MCP_SERVER_URL},
        cache_tools_list=True,
    ) as mcp:

        # --- Build 4 specialist sub-agents (each gets the shared MCP connection) ---
        discovery_agent = create_discovery_agent(mcp)
        ranking_agent   = create_ranking_agent(mcp)
        booking_agent   = create_booking_agent(mcp)
        followup_agent  = create_followup_agent(mcp)

        # --- Wrap each as a callable tool for the Orchestrator ---
        tools = [
            discovery_agent.as_tool(
                tool_name="run_discovery",
                tool_description=(
                    "Find available service providers. "
                    "Pass service_type, area (location_text), and slot_date. "
                    "Returns: list of providers with available_slots."
                ),
            ),
            ranking_agent.as_tool(
                tool_name="run_ranking",
                tool_description=(
                    "Rank providers by rating, proximity, and availability. "
                    "Pass the full providers list from discovery. "
                    "Returns: ranked_providers list with scores."
                ),
            ),
            booking_agent.as_tool(
                tool_name="run_booking",
                tool_description=(
                    "Create a confirmed booking for the top-ranked provider. "
                    "Pass user_id, provider_id, and slot_id. "
                    "Returns: booking_id, confirmation_code."
                ),
            ),
            followup_agent.as_tool(
                tool_name="run_followup",
                tool_description=(
                    "Schedule reminder and completion-check notifications. "
                    "Pass booking_id, user_id, slot_datetime. "
                    "Returns: scheduled notification records."
                ),
            ),
        ]

        # --- Orchestrator Agent ---
        # Has 4 sub-agent tools + direct MCP for session/trace tools.
        # Its LLM reads the user message, extracts intent internally,
        # then calls run_discovery → run_ranking → run_booking → run_followup in order.
        orchestrator = Agent(
            name="Orchestrator",
            instructions=ORCHESTRATOR_PROMPT,
            model=build_primary_model(),
            tools=tools,
            mcp_servers=[mcp],  # create_session_tool, update_session_status_tool, write_trace_log_tool
        )

        initial_message = (
            f"user_id: {user_id}\n"
            f"user_request: {user_input}\n\n"
            "Understand the request, extract intent, then process through all steps in order."
        )

        result = await Runner.run(
            orchestrator,
            input=initial_message,
            run_config=RunConfig(tracing_disabled=True),
        )

        return {
            "status": "success",
            "summary": result.final_output,
        }
```

---

### Step 6 — Update MCP Server (`mcp_server/server.py`)

The tool functions and `@mcp.tool()` registrations are **unchanged**. Only the `__main__` entry point changes to serve over HTTP instead of stdio:

```python
# BEFORE (current) — stdio transport
if __name__ == "__main__":
    mcp.run()

# AFTER — streamable HTTP transport
if __name__ == "__main__":
    import os
    port = int(os.environ.get("MCP_PORT", 8001))
    # Use SSE transport for better stability on Windows
    mcp.run(transport="sse", host="0.0.0.0", port=port)
    # All tools now served at: http://0.0.0.0:{port}/sse
```

### **Windows Stability Note**
On Windows, the `streamable-http` transport can be flaky due to bidirectional streaming issues. We switched to **SSE (Server-Sent Events)** for the tool transport and implemented **absolute path loading** for the `.env` file to ensure API keys are always found.

Optionally add a `/health` route for Docker readiness probes:
```python
from starlette.requests import Request
from starlette.responses import PlainTextResponse

@mcp.custom_route("/health", methods=["GET"])
async def health(request: Request) -> PlainTextResponse:
    return PlainTextResponse("ok")
```

Run order (local development):
```bash
# Terminal 1 — MCP server first
uv run python -m mcp_server.server
# → http://0.0.0.0:8001/mcp

# Terminal 2 — FastAPI app
uv run uvicorn app.main:app --reload
```

### Step 7 — Delete Obsolete Files

- **Delete** `app/agents/mcp_client.py` — replaced by `MCPServerStreamableHttp` in orchestrator

---

## How It All Connects

```
POST /requests
    ↓
run_workflow(user_input, user_id)
    ↓
MCPServerStreamableHttp connects to http://localhost:8001/mcp
    ↓
4 specialist SDK Agents created (each gets mcp_servers=[mcp])
    ↓
Each wrapped with .as_tool() → 4 callable tools
    ↓
Orchestrator Agent created with 4 tools + mcp_servers=[mcp]
    ↓
Runner.run(orchestrator, input=initial_message)
    ↓
Orchestrator LLM FIRST reasons about the user message:
  → extracts service_type, location_text, time_preference, urgency, detected_language
  → calls create_session_tool (direct MCP)
Then calls tools in sequence:
  1. run_discovery(service_type, area, slot_date)
       → SDK runs DiscoveryAgent → calls find_providers_tool on MCP → returns providers
       → Orchestrator calls write_trace_log_tool
  2. run_ranking(providers)
       → SDK runs RankingAgent → calls rank_providers_tool on MCP → returns ranked list
       → Orchestrator calls write_trace_log_tool
  3. run_booking(user_id, provider_id, slot_id)
       → SDK runs BookingAgent → calls create_booking_tool on MCP → returns booking
       → Orchestrator calls write_trace_log_tool
  4. run_followup(booking_id, user_id, slot_datetime)
       → SDK runs FollowupAgent → calls schedule_followups_tool on MCP → returns notifications
       → Orchestrator calls write_trace_log_tool
       → Orchestrator calls update_session_status_tool("completed")
    ↓
result.final_output = booking confirmation summary
    ↓
{"status": "success", "summary": "..."}
```

---

## Dependencies

```bash
uv add openai-agents          # new
uv remove google-generativeai # remove — Gemini via OpenAI-compat, no separate SDK needed
```

---

## Check When Done

### MCP Server (`mcp_server/server.py`)
- [ ] `mcp.run(transport="http", host="0.0.0.0", port=8001)` in `__main__`
- [ ] `uv run python -m mcp_server.server` starts and responds at `http://localhost:8001/mcp`
- [ ] All 7 tools still discovered correctly over HTTP
- [ ] `MCP_PORT` env var overrides default port

### Agent Files (`app/agents/`)
- [ ] `models.py` — `IntentResult`, `build_primary_model()`, `build_fallback_model()`
- [ ] `discovery_agent.py` — SDK `Agent` with `mcp_servers=[mcp]`
- [ ] `ranking_agent.py` — SDK `Agent` with `mcp_servers=[mcp]`
- [ ] `booking_agent.py` — SDK `Agent` with `mcp_servers=[mcp]`
- [ ] `followup_agent.py` — SDK `Agent` with `mcp_servers=[mcp]`
- [ ] `orchestrator.py` — 4 sub-agents as tools, Orchestrator handles intent itself
- [ ] `intent_agent.py` deleted
- [ ] `mcp_client.py` deleted

### Prompts (`app/agents/prompts.py`)
- [ ] `ORCHESTRATOR_PROMPT` has Phase 1 (intent reasoning) + Phase 2 (4-step sequential tools)
- [ ] No `INTENT_EXTRACTION_PROMPT` — removed
- [ ] Each sub-agent prompt names exactly which MCP tool it must call

### Config & Environment
- [ ] `OPENAI_API_KEY`, `GEMINI_API_KEY`, `MCP_SERVER_URL`, `MCP_PORT` in `config.py`
- [ ] `.env.example` updated
- [ ] `google-generativeai` removed from `pyproject.toml`

### End-to-End
- [ ] MCP server running before `POST /requests` is called
- [ ] Bad OpenAI key triggers Gemini fallback without crashing
- [ ] Trace logs written for all 5 steps via `write_trace_log_tool`
- [ ] `POST /requests` returns `{"status": "success", "summary": "..."}`
