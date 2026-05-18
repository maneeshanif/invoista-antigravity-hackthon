```
Starting AI Service Marketplace Multi-Server...
[APP] INFO:     Will watch for changes in these directories: ['/home/habib/personal-projects/innovista hackathon/invoista-antigravity-hackthon/backend']
[MCP] INFO:     Started server process [16096]
[MCP] INFO:     Waiting for application startup.
[MCP] INFO:     Application startup complete.
[MCP] INFO:     Uvicorn running on http://0.0.0.0:8001 (Press CTRL+C to quit)
[APP] INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
[APP] INFO:     Started reloader process [16131] using WatchFiles
[APP] INFO:     Started server process [16190]
[APP] INFO:     Waiting for application startup.
[APP] INFO:     Application startup complete.
[APP] INFO:     127.0.0.1:40894 - "OPTIONS /api/v1/requests/ HTTP/1.1" 200 OK
[APP] INFO:     127.0.0.1:40908 - "POST /api/v1/requests/ HTTP/1.1" 200 OK
[MCP] INFO:     127.0.0.1:36970 - "GET /sse HTTP/1.1" 200 OK
[MCP] INFO:     127.0.0.1:36980 - "POST /messages/?session_id=f43e931335a44a4eb7f4e13813da2e65 HTTP/1.1" 202 Accepted
[MCP] INFO:     127.0.0.1:36980 - "POST /messages/?session_id=f43e931335a44a4eb7f4e13813da2e65 HTTP/1.1" 202 Accepted
[APP] Creating session for input: i need an AC technic...
[APP] INFO:     127.0.0.1:40908 - "OPTIONS /api/v1/requests/b83e0a6e-62fa-4e82-9ccc-fd15d9db93c0 HTTP/1.1" 200 OK
[APP] INFO:     127.0.0.1:40894 - "GET /api/v1/requests/b83e0a6e-62fa-4e82-9ccc-fd15d9db93c0 HTTP/1.1" 404 Not Found
[APP] INFO:     127.0.0.1:40908 - "OPTIONS /api/v1/requests/b83e0a6e-62fa-4e82-9ccc-fd15d9db93c0/trace HTTP/1.1" 200 OK
[APP] DEBUG: OPENAI_API_KEY length: 164
[APP] DEBUG: OPENAI_API_KEY length: 164
[APP] DEBUG: OPENAI_API_KEY length: 164
[APP] DEBUG: OPENAI_API_KEY length: 164
[APP] DEBUG: OPENAI_API_KEY length: 164
[APP] Tracing is disabled. Not creating trace Agent workflow
[APP] Setting current trace: no-op
[APP] Parent None or <agents.tracing.traces.NoOpTrace object at 0x7ca67dc11650> is no-op, returning NoOpSpan
[APP] INFO:     127.0.0.1:40894 - "GET /api/v1/requests/b83e0a6e-62fa-4e82-9ccc-fd15d9db93c0/trace HTTP/1.1" 200 OK
[APP] Parent <agents.tracing.spans.NoOpSpan object at 0x7ca67ad057c0> or <agents.tracing.traces.NoOpTrace object at 0x7ca67dc11650> is no-op, returning NoOpSpan
[APP] Running agent Orchestrator (turn 1)
[APP] Parent <agents.tracing.spans.NoOpSpan object at 0x7ca67d6cd900> or <agents.tracing.traces.NoOpTrace object at 0x7ca67dc11650> is no-op, returning NoOpSpan
[APP] ============================================================
[APP] 🔵 [RUN HOOK] AGENT START ▶ Orchestrator
[APP] ============================================================
[APP] ============================================================
[APP] 🚀 [AGENT HOOK] START ▶ Orchestrator (Session: b83e0a6e-62fa-4e82-9ccc-fd15d9db93c0)
[APP] ============================================================
[APP] ============================================================
[APP] 📝 [RUN HOOK] LLM START ▶ Orchestrator
[APP]    System prompt (2649 chars):
[APP] You are the Lead Orchestrator for the AI Service Marketplace.
[APP] 
[APP] You will receive a user request that may be in English, Urdu, or Roman Urdu.
[APP] You will also receive session_id, user_id, and today's date...
[APP]    Input items: 1
[APP] ============================================================
[APP] ============================================================
[APP] 🧠 [AGENT HOOK] LLM START ▶ Orchestrator
[APP]    System prompt (2649 chars):
[APP] You are the Lead Orchestrator for the AI Service Marketplace.
[APP] 
[APP] You will receive a user request that may be in English, Urdu, or Roman Urdu.
[APP] You will also receive session_id, user_id, and today's date...
[APP]    Input items: 1
[APP] ============================================================
[APP] No conversation_id available for request
[APP] Tracing is disabled. Not creating span <agents.tracing.span_data.GenerationSpanData object at 0x7ca67ace8b90>
[APP] Calling LLM
[APP] Received model response
[APP] ============================================================
[APP] 💬 [AGENT HOOK] LLM END ◀ Orchestrator  (5366ms)
[APP]    Response: ModelResponse(output=[ResponseOutputMessage(id='__fake_id__', content=[ResponseOutputText(annotations=[], text='PHASE 1 — UNDERSTAND THE REQUEST:\n\n- **service_type**: "AC Technician"\n- **location_text**: "G-13"\n- **time_preference**: "tomorrow" (default time will be "morning")\n- **urgency**: "medium" (default)\n- **slot_date**: "2026-05-19" (computed from today\'s date and time preference)\n\
[APP] ============================================================
[APP] ============================================================
[APP] 📝 [RUN HOOK] LLM END ◀ Orchestrator  (5366ms)
[APP]    Response: ModelResponse(output=[ResponseOutputMessage(id='__fake_id__', content=[ResponseOutputText(annotations=[], text='PHASE 1 — UNDERSTAND THE REQUEST:\n\n- **service_type**: "AC Technician"\n- **location_text**: "G-13"\n- **time_preference**: "tomorrow" (default time will be "morning")\n- **urgency**: "medium" (default)\n- **slot_date**: "2026-05-19" (computed from today\'s date and time preference)\n\...
[APP] ============================================================
[APP] Processing output item type=message class=ResponseOutputMessage
[APP] ============================================================
[APP] 🔴 [RUN HOOK] AGENT END ◀ Orchestrator  (6397ms)
[APP]    Output: PHASE 1 — UNDERSTAND THE REQUEST:
[APP] 
[APP] - **service_type**: "AC Technician"
[APP] - **location_text**: "G-13"
[APP] - **time_preference**: "tomorrow" (default time will be "morning")
[APP] - **urgency**: "medium" (default)
[APP] - **slot_date**: "2026-05-19" (computed from today's date and time preference)
[APP] 
[APP] PHASE 2 — CALL TOOLS IN THIS EXACT ORDER:
[APP] 
[APP] ### STEP 1: Call `run_discovery`
[APP] Calling the `run_discovery` function with the computed parameters.
[APP] 
[APP] ```json
[APP] {
[APP] "input": "{\"service_type\":\"AC Technician\", \"area\":\"G-13\"
[APP] ============================================================
[APP] ============================================================
[APP] ✅ [AGENT HOOK] END ◀ Orchestrator  (6397ms)
[APP]    Output: PHASE 1 — UNDERSTAND THE REQUEST:
[APP] 
[APP] - **service_type**: "AC Technician"
[APP] - **location_text**: "G-13"
[APP] - **time_preference**: "tomorrow" (default time will be "morning")
[APP] - **urgency**: "medium" (default)
[APP] - **slot_date**: "2026-05-19" (computed from today's date and time preference)
[APP] 
[APP] PHASE 2 — CALL TOOLS IN THIS EXACT ORDER:
[APP] 
[APP] ### STEP 1: Call `run_discovery`
[APP] Calling the `run_discovery` function with the computed parameters.
[APP] 
[APP] ```json
[APP] {
[APP] "input": "{\"service_type\":\"AC Technician\", \"area\":\"G-13\"
[APP] ============================================================
[APP] Resetting current trace
```


# Issue
The workflow is not working now as expected.