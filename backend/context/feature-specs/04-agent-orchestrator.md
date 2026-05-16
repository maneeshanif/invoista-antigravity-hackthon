# Agent Orchestrator Specification

## Description

Implement the multi-agent orchestrator using the Google GenAI SDK (Gemini). The orchestrator is responsible for managing the flow between different specialized agents to fulfill a user's service request. It will communicate with the MCP server to execute tools and maintain the session state and trace logs.

## Design

The workflow follows a sequential handover pattern:
1.  **Intent Agent**: Extracts the core intent (service, location, time) from the user's raw input.
2.  **Discovery Agent**: Uses the `find_providers` tool to find matching service providers.
3.  **Ranking Agent**: Uses the `rank_providers` tool to select the best provider based on the ranking formula.
4.  **Booking Agent**: Uses the `create_booking` tool to finalize the reservation.
5.  **Follow-up Agent**: Uses the `schedule_followups` tool to set up reminders.

Every step must call `write_trace_log` to ensure full transparency.

## Implementation

- **Location**: `backend/app/agents/`
- **Files**:
    - `orchestrator.py`: Main entry point for starting the workflow.
    - `intent_agent.py`: Agent for intent extraction.
    - `discovery_agent.py`: Agent for finding providers.
    - `ranking_agent.py`: Agent for ranking.
    - `booking_agent.py`: Agent for creating bookings.
    - `followup_agent.py`: Agent for scheduling follow-ups.
    - `prompts.py`: System prompts for each agent.
- **MCP Client**: The orchestrator will use an MCP client to talk to the local MCP server.

## Dependencies

- `google-generativeai` (Gemini SDK)
- `mcp` (Client implementation)

## Check When Done

- Orchestrator successfully runs the full flow from raw text to booking.
- All tools are called by the respective agents via MCP.
- Trace logs are correctly populated in the database for each step.
- Session status is updated upon completion.
