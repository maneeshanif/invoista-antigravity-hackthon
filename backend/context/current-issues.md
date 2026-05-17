Logs: ```
uv run python scripts/dev_server.py 
Starting AI Service Marketplace Multi-Server...
[MCP] INFO:     Started server process [141680]
[MCP] INFO:     Waiting for application startup.
[MCP] INFO:     Application startup complete.
[MCP] INFO:     Uvicorn running on http://0.0.0.0:8001 (Press CTRL+C to quit)
[APP] INFO:     Will watch for changes in these directories: ['/home/habib/personal-projects/innovista hackathon/invoista-antigravity-hackthon/backend']
[APP] INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
[APP] INFO:     Started reloader process [141710] using WatchFiles
[APP] INFO:     Started server process [141731]
[APP] INFO:     Waiting for application startup.
[APP] INFO:     Application startup complete.
[APP] INFO:     127.0.0.1:34802 - "POST /api/v1/requests/ HTTP/1.1" 200 OK
[MCP] INFO:     127.0.0.1:49152 - "GET /sse HTTP/1.1" 200 OK
[MCP] INFO:     127.0.0.1:49158 - "POST /messages/?session_id=498106eef38944df8b927aef05c73fcb HTTP/1.1" 202 Accepted
[MCP] INFO:     127.0.0.1:49158 - "POST /messages/?session_id=498106eef38944df8b927aef05c73fcb HTTP/1.1" 202 Accepted
[APP] Creating session for input: I need a AC Technici...
[APP] DEBUG: OPENAI_API_KEY length: 0
[APP] DEBUG: OpenAI initialization failed or API error: OPENAI_API_KEY is not set in .env file or environment variables.
[APP] Falling back to Gemini...
[APP] Tracing is disabled. Not creating trace Agent workflow
[APP] Setting current trace: no-op
[APP] Parent None or <agents.tracing.traces.NoOpTrace object at 0x7a2839c65310> is no-op, returning NoOpSpan
[APP] Parent <agents.tracing.spans.NoOpSpan object at 0x7a2839d1b3e0> or <agents.tracing.traces.NoOpTrace object at 0x7a2839c65310> is no-op, returning NoOpSpan
[MCP] INFO:     127.0.0.1:49158 - "POST /messages/?session_id=498106eef38944df8b927aef05c73fcb HTTP/1.1" 202 Accepted
[MCP] [05/17/26 11:40:51] INFO     Processing request of type  server.py:727
[MCP] ListToolsRequest
[APP] Parent <agents.tracing.spans.NoOpSpan object at 0x7a2839d1b3e0> or <agents.tracing.traces.NoOpTrace object at 0x7a2839c65310> is no-op, returning NoOpSpan
[APP] Running agent Orchestrator-Fallback (turn 1)
[APP] Parent <agents.tracing.spans.NoOpSpan object at 0x7a2837338cd0> or <agents.tracing.traces.NoOpTrace object at 0x7a2839c65310> is no-op, returning NoOpSpan
[APP] 🚦 Runner: on_agent_start for Orchestrator-Fallback
[APP] 🟢 Agent Orchestrator-Fallback started in session 95ef5cb6-a49d-4ca4-a237-8a102e13fd99
[APP] 🧠 Runner: on_llm_start by Orchestrator-Fallback
[APP] 🤖 Agent Orchestrator-Fallback started LLM call in session 95ef5cb6-a49d-4ca4-a237-8a102e13fd99
[APP] No conversation_id available for request
[APP] Tracing is disabled. Not creating span <agents.tracing.span_data.GenerationSpanData object at 0x7a2839ce6c30>
[APP] Calling LLM
[APP] Received model response
[APP] 📋 Agent Orchestrator-Fallback ended LLM call in session 95ef5cb6-a49d-4ca4-a237-8a102e13fd99 after 3225ms
[APP] 📝 Runner: on_llm_end by Orchestrator-Fallback after 3225ms
[APP] Processing output item type=function_call class=ResponseFunctionToolCall
[APP] Parent <agents.tracing.spans.NoOpSpan object at 0x7a2837375db0> or <agents.tracing.traces.NoOpTrace object at 0x7a2839c65310> is no-op, returning NoOpSpan
[APP] 🛠️ Runner: on_tool_start for tool create_session_tool by Orchestrator-Fallback
[APP] ⚙️ Agent Orchestrator-Fallback started tool create_session_tool in session 95ef5cb6-a49d-4ca4-a237-8a102e13fd99
[APP] Invoking MCP tool create_session_tool
[MCP] INFO:     127.0.0.1:49158 - "POST /messages/?session_id=498106eef38944df8b927aef05c73fcb HTTP/1.1" 202 Accepted
[MCP] [05/17/26 11:40:55] INFO     Processing request of type  server.py:727
[MCP] CallToolRequest
[MCP] INFO     HTTP Request: POST        _client.py:1025
[MCP] https://vbprmayvgzqbfwisb
[MCP] kzq.supabase.co/rest/v1/s
[MCP] essions "HTTP/2 201
[MCP] Created"
[APP] MCP tool create_session_tool completed.
[APP] ✅ Runner: on_tool_end for tool create_session_tool by Orchestrator-Fallback after 390ms
[APP] 🔧 Agent Orchestrator-Fallback ended tool create_session_tool in session 95ef5cb6-a49d-4ca4-a237-8a102e13fd99 after 390ms
[APP] Parent <agents.tracing.spans.NoOpSpan object at 0x7a2837338cd0> or <agents.tracing.traces.NoOpTrace object at 0x7a2839c65310> is no-op, returning NoOpSpan
[APP] Running agent Orchestrator-Fallback (turn 2)
[APP] Parent <agents.tracing.spans.NoOpSpan object at 0x7a2837338cd0> or <agents.tracing.traces.NoOpTrace object at 0x7a2839c65310> is no-op, returning NoOpSpan
[APP] 🧠 Runner: on_llm_start by Orchestrator-Fallback
[APP] 🤖 Agent Orchestrator-Fallback started LLM call in session 95ef5cb6-a49d-4ca4-a237-8a102e13fd99
[APP] No conversation_id available for request
[APP] Tracing is disabled. Not creating span <agents.tracing.span_data.GenerationSpanData object at 0x7a2836ba9cd0>
[APP] Calling LLM
[APP] Received model response
[APP] 📋 Agent Orchestrator-Fallback ended LLM call in session 95ef5cb6-a49d-4ca4-a237-8a102e13fd99 after 2214ms
[APP] 📝 Runner: on_llm_end by Orchestrator-Fallback after 2214ms
[APP] Processing output item type=function_call class=ResponseFunctionToolCall
[APP] Parent <agents.tracing.spans.NoOpSpan object at 0x7a2837375d10> or <agents.tracing.traces.NoOpTrace object at 0x7a2839c65310> is no-op, returning NoOpSpan
[APP] 🛠️ Runner: on_tool_start for tool run_discovery by Orchestrator-Fallback
[APP] ⚙️ Agent Orchestrator-Fallback started tool run_discovery in session 95ef5cb6-a49d-4ca4-a237-8a102e13fd99
[APP] Invoking tool run_discovery
[APP] Parent <agents.tracing.spans.NoOpSpan object at 0x7a2836be47d0> or <agents.tracing.traces.NoOpTrace object at 0x7a2839c65310> is no-op, returning NoOpSpan
[APP] Parent <agents.tracing.spans.NoOpSpan object at 0x7a2836be4d70> or <agents.tracing.traces.NoOpTrace object at 0x7a2839c65310> is no-op, returning NoOpSpan
[APP] Parent <agents.tracing.spans.NoOpSpan object at 0x7a2836be4d70> or <agents.tracing.traces.NoOpTrace object at 0x7a2839c65310> is no-op, returning NoOpSpan
[APP] Running agent DiscoveryAgent (turn 1)
[APP] Parent <agents.tracing.spans.NoOpSpan object at 0x7a2836be42d0> or <agents.tracing.traces.NoOpTrace object at 0x7a2839c65310> is no-op, returning NoOpSpan
[APP] 🟢 Agent DiscoveryAgent started in session 95ef5cb6-a49d-4ca4-a237-8a102e13fd99
[APP] 🤖 Agent DiscoveryAgent started LLM call in session 95ef5cb6-a49d-4ca4-a237-8a102e13fd99
[APP] No conversation_id available for request
[APP] Tracing is disabled. Not creating span <agents.tracing.span_data.GenerationSpanData object at 0x7a2836baaed0>
[APP] Calling LLM
[APP] Received model response
[APP] 📋 Agent DiscoveryAgent ended LLM call in session 95ef5cb6-a49d-4ca4-a237-8a102e13fd99 after 2764ms
[APP] Processing output item type=function_call class=ResponseFunctionToolCall
[APP] Parent <agents.tracing.spans.NoOpSpan object at 0x7a2836c052c0> or <agents.tracing.traces.NoOpTrace object at 0x7a2839c65310> is no-op, returning NoOpSpan
[APP] ⚙️ Agent DiscoveryAgent started tool find_providers_tool in session 95ef5cb6-a49d-4ca4-a237-8a102e13fd99
[APP] Invoking MCP tool find_providers_tool
[MCP] INFO:     127.0.0.1:36360 - "POST /messages/?session_id=498106eef38944df8b927aef05c73fcb HTTP/1.1" 202 Accepted
[MCP] [05/17/26 11:41:01] INFO     Processing request of type  server.py:727
[MCP] CallToolRequest
[MCP] INFO     HTTP Request: GET         _client.py:1025
[MCP] https://vbprmayvgzqbfwisb
[MCP] kzq.supabase.co/rest/v1/p
[MCP] roviders?select=%2A&categ
[MCP] ory=ilike.%25AC+Technicia
[MCP] n%25&area=ilike.%25G-13%2
[MCP] 5&is_active=eq.True
[MCP] "HTTP/2 200 OK"
[MCP] INFO     HTTP Request: GET         _client.py:1025
[MCP] https://vbprmayvgzqbfwisb
[MCP] kzq.supabase.co/rest/v1/p
[MCP] rovider_slots?select=id%2
[MCP] Cslot_time&provider_id=eq
[MCP] .22222222-2222-2222-2222-
[MCP] 222222222221&slot_date=eq
[MCP] .2024-05-16&is_booked=eq.
[MCP] False "HTTP/2 200 OK"
[MCP] [05/17/26 11:41:02] INFO     HTTP Request: GET         _client.py:1025
[MCP] https://vbprmayvgzqbfwisb
[MCP] kzq.supabase.co/rest/v1/p
[MCP] rovider_slots?select=id%2
[MCP] Cslot_time&provider_id=eq
[MCP] .22222222-2222-2222-2222-
[MCP] 222222222222&slot_date=eq
[MCP] .2024-05-16&is_booked=eq.
[MCP] False "HTTP/2 200 OK"
[MCP] INFO     HTTP Request: GET         _client.py:1025
[MCP] https://vbprmayvgzqbfwisb
[MCP] kzq.supabase.co/rest/v1/p
[MCP] rovider_slots?select=id%2
[MCP] Cslot_time&provider_id=eq
[MCP] .e3a42c3a-b61d-47ec-869d-
[MCP] 98612bfe7a0c&slot_date=eq
[MCP] .2024-05-16&is_booked=eq.
[MCP] False "HTTP/2 200 OK"
[MCP] INFO     HTTP Request: GET         _client.py:1025
[MCP] https://vbprmayvgzqbfwisb
[MCP] kzq.supabase.co/rest/v1/p
[MCP] rovider_slots?select=id%2
[MCP] Cslot_time&provider_id=eq
[MCP] .d87930ee-6ea0-49c9-a5e9-
[MCP] a9605da4bd3a&slot_date=eq
[MCP] .2024-05-16&is_booked=eq.
[MCP] False "HTTP/2 200 OK"
[APP] MCP tool find_providers_tool completed.
[APP] 🔧 Agent DiscoveryAgent ended tool find_providers_tool in session 95ef5cb6-a49d-4ca4-a237-8a102e13fd99 after 1559ms
[APP] Parent <agents.tracing.spans.NoOpSpan object at 0x7a2836be42d0> or <agents.tracing.traces.NoOpTrace object at 0x7a2839c65310> is no-op, returning NoOpSpan
[APP] Running agent DiscoveryAgent (turn 2)
[APP] Parent <agents.tracing.spans.NoOpSpan object at 0x7a2836be42d0> or <agents.tracing.traces.NoOpTrace object at 0x7a2839c65310> is no-op, returning NoOpSpan
[APP] 🤖 Agent DiscoveryAgent started LLM call in session 95ef5cb6-a49d-4ca4-a237-8a102e13fd99
[APP] No conversation_id available for request
[APP] Tracing is disabled. Not creating span <agents.tracing.span_data.GenerationSpanData object at 0x7a2836bab110>
[APP] Calling LLM
[APP] Received model response
[APP] 📋 Agent DiscoveryAgent ended LLM call in session 95ef5cb6-a49d-4ca4-a237-8a102e13fd99 after 3665ms
[APP] Processing output item type=message class=ResponseOutputMessage
[APP] 🛑 Agent DiscoveryAgent ended in session 95ef5cb6-a49d-4ca4-a237-8a102e13fd99 after 7995ms
[APP] ✅ Runner: on_tool_end for tool run_discovery by Orchestrator-Fallback after 8000ms
[APP] 🔧 Agent Orchestrator-Fallback ended tool run_discovery in session 95ef5cb6-a49d-4ca4-a237-8a102e13fd99 after 8001ms
[APP] Parent <agents.tracing.spans.NoOpSpan object at 0x7a2837338cd0> or <agents.tracing.traces.NoOpTrace object at 0x7a2839c65310> is no-op, returning NoOpSpan
[APP] Running agent Orchestrator-Fallback (turn 3)
[APP] Parent <agents.tracing.spans.NoOpSpan object at 0x7a2837338cd0> or <agents.tracing.traces.NoOpTrace object at 0x7a2839c65310> is no-op, returning NoOpSpan
[APP] 🧠 Runner: on_llm_start by Orchestrator-Fallback
[APP] 🤖 Agent Orchestrator-Fallback started LLM call in session 95ef5cb6-a49d-4ca4-a237-8a102e13fd99
[APP] No conversation_id available for request
[APP] Tracing is disabled. Not creating span <agents.tracing.span_data.GenerationSpanData object at 0x7a236bab1d0>
[APP] Calling LLM
[APP] Received model response
[APP] 📋 Agent Orchestrator-Fallback ended LLM call in session 95ef5cb6-a49d-4ca4-a237-8a102e13fd99 after 30423ms
[APP] 📝 Runner: on_llm_end by Orchestrator-Fallback after 30423ms
[APP] 🏁 Runner: on_agent_end for Orchestrator-Fallback after 50913ms
[APP] 🛑 Agent Orchestrator-Fallback ended in session 95ef5cb6-a49d-4ca4-a237-8a102e13fd99 after 50913ms
[APP] Resetting current trace
```


# Issue
The model is going around 3 turns and reaching the run_discovery agent as tool, but the issue is the other agents as tool aren't being called to complete the whole workflow.


# The traces logged in the DB
[{"idx":0,"id":"2aa730df-8281-4683-87e4-375e92548669","session_id":"95ef5cb6-a49d-4ca4-a237-8a102e13fd99","step":3,"agent_name":"Orchestrator-Fallback","tool_used":"llm_call","input_payload":"{}","output_payload":"{\"response\": \"ModelResponse(output=[ResponseFunctionToolCall(arguments='{\\\"input\\\":\\\"service_type: AC Technician, area: G-13, slot_date: 2024-05-16\\\"}', call_id='function-call-9559306861161466568', name='run_discovery', type='function_call', id='__fake_id__', namespace=None, status=None, provider_data={'model': 'gemini-2.5-flash', 'response_id': '-GIJavKZF72hkdUPiq2IgAQ'})], usage=Usage(requests=1, input_tokens=2297, input_tokens_details=InputTokensDetails(cached_tokens=0), output_tokens=43, output_tokens_details=OutputTokensDetails(reasoning_tokens=0), total_tokens=2605, request_usage_entries=[]), response_id=None, request_id=None)\"}","output_summary":"LLM call completed by Orchestrator-Fallback.","duration_ms":2214,"created_at":"2026-05-17 06:40:58.362757+00"},{"idx":1,"id":"3266ca75-6105-43c2-944f-162e36b02ce0","session_id":"95ef5cb6-a49d-4ca4-a237-8a102e13fd99","step":5,"agent_name":"Orchestrator-Fallback","tool_used":"llm_call","input_payload":"{}","output_payload":"{\"response\": \"ModelResponse(output=[], usage=Usage(requests=1, input_tokens=2998, input_tokens_details=InputTokensDetails(cached_tokens=0), output_tokens=0, output_tokens_details=OutputTokensDetails(reasoning_tokens=0), total_tokens=2998, request_usage_entries=[]), response_id=None, request_id=None)\"}","output_summary":"LLM call completed by Orchestrator-Fallback.","duration_ms":30423,"created_at":"2026-05-17 06:41:42.52253+00"},{"idx":2,"id":"472272dd-5e57-4cdc-b3f2-459ee04b0175","session_id":"95ef5cb6-a49d-4ca4-a237-8a102e13fd99","step":2,"agent_name":"Orchestrator-Fallback","tool_used":"create_session_tool","input_payload":"{}","output_payload":"{\"result\": \"{'type': 'text', 'text': '{\\\\n  \\\"session_id\\\": \\\"4b3c48a1-b500-42ff-a395-efe975a45daa\\\",\\\\n  \\\"status\\\": \\\"in_progress\\\"\\\\n}'}\"}","output_summary":"Tool create_session_tool executed by Orchestrator-Fallback.","duration_ms":390,"created_at":"2026-05-17 06:40:55.853812+00"},{"idx":3,"id":"a48f4a61-2334-4b4f-b142-279320150f3b","session_id":"95ef5cb6-a49d-4ca4-a237-8a102e13fd99","step":1,"agent_name":"Orchestrator-Fallback","tool_used":"llm_call","input_payload":"{}","output_payload":"{\"response\": \"ModelResponse(output=[ResponseFunctionToolCall(arguments='{\\\"input\\\":{\\\"raw_input\\\":\\\"I need a AC Technician in G-13 Islamabad tomorrow morning for AC repair\\\",\\\"user_id\\\":\\\"11111111-1111-1111-1111-111111111111\\\"}}', call_id='function-call-18303494354533785212', name='create_session_tool', type='function_call', id='__fake_id__', namespace=None, status=None, provider_data={'model': 'gemini-2.5-flash', 'response_id': '9WIJaqWUIo-lkdUP6ZjGwA0'})], usage=Usage(requests=1, input_tokens=2146, input_tokens_details=InputTokensDetails(cached_tokens=0), output_tokens=81, output_tokens_details=OutputTokensDetails(reasoning_tokens=0), total_tokens=2362, request_usage_entries=[]), response_id=None, request_id=None)\"}","output_summary":"LLM call completed by Orchestrator-Fallback.","duration_ms":3225,"created_at":"2026-05-17 06:40:55.181324+00"},{"idx":4,"id":"d1b620c2-fbaf-4828-a923-363c60508d79","session_id":"95ef5cb6-a49d-4ca4-a237-8a102e13fd99","step":6,"agent_name":"Runner","tool_used":"agent_Orchestrator-Fallback","input_payload":"{}","output_payload":"{\"result\": \"\"}","output_summary":"Agent Orchestrator-Fallback completed.","duration_ms":50913,"created_at":"2026-05-17 06:41:43.389978+00"},{"idx":5,"id":"de8eb9c4-1357-489d-a0e3-cfdfcf1e4aa2","session_id":"95ef5cb6-a49d-4ca4-a237-8a102e13fd99","step":4,"agent_name":"Orchestrator-Fallback","tool_used":"run_discovery","input_payload":"{}","output_payload":"{\"result\": \"```json\\n{\\n  \\\"providers\\\": [\\n    {\\n      \\\"provider_id\\\": \\\"22222222-2222-2222-2222-222222222221\\\",\\n      \\\"name\\\": \\\"Ali AC Repairs\\\",\\n      \\\"category\\\": \\\"AC Technician\\\",\\n      \\\"area\\\": \\\"G-13, Islamabad\\\",\\n      \\\"lat\\\": 33.65,\\n      \\\"lng\\\": 72.982,\\n      \\\"rating\\\": 4.8,\\n      \\\"jobs_completed\\\": 145,\\n      \\\"price_range\\\": \\\"$$\\\",\\n      \\\"available_slots\\\": []\\n    },\\n    {\\n      \\\"provider_id\\\": \\\"22222222-2222-2222-2222-222222222222\\\",\\n      \\\"name\\\": \\\"Cool Tech Services\\\",\\n      \\\"category\\\": \\\"AC Technician\\\",\\n      \\\"area\\\": \\\"G-13, Islamabad\\\",\\n      \\\"lat\\\": 33.648,\\n      \\\"lng\\\": 72.98,\\n      \\\"rating\\\": 4.5,\\n      \\\"jobs_completed\\\": 89,\\n      \\\"price_range\\\": \\\"$\\\",\\n      \\\"available_slots\\\": []\\n    },\\n    {\\n      \\\"provider_id\\\": \\\"e3a42c3a-b61d-47ec-869d-98612bfe7a0c\\\",\\n      \\\"name\\\": \\\"Cool Breeze AC 3\\\",\\n      \\\"category\\\": \\\"AC Technician\\\",\\n      \\\"area\\\": \\\"G-13\\\",\\n      \\\"lat\\\": 33.6852,\\n      \\\"lng\\\": 73.0147,\\n      \\\"rating\\\": 3.6,\\n      \\\"jobs_completed\\\": 127,\\n      \\\"price_range\\\": \\\"$\\\",\\n      \\\"available_slots\\\": []\\n    },\\n    {\\n      \\\"provider_id\\\": \\\"d87930ee-6ea0-49c9-a5e9-a9605da4bd3a\\\",\\n      \\\"name\\\": \\\"Chilly Experts 18\\\",\\n      \\\"category\\\": \\\"AC Technician\\\",\\n      \\\"area\\\": \\\"G-13\\\",\\n      \\\"lat\\\": 33.7038,\\n      \\\"lng\\\": 73.0466,\\n      \\\"rating\\\": 4.7,\\n      \\\"jobs_completed\\\": 83,\\n      \\\"price_range\\\": \\\"$\\\",\\n      \\\"available_slots\\\": []\\n    }\\n  ],\\n  \\\"total_found\\\": 4\\n}\\n```\"}","output_summary":"Tool run_discovery executed by Orchestrator-Fallback.","duration_ms":8000,"created_at":"2026-05-17 06:41:06.683341+00"}]