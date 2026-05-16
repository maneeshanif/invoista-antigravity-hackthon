# Agents Context

## Agent Flow

```mermaid
sequenceDiagram
    participant User
    participant App as React Native App
    participant API as FastAPI
    participant O as Orchestrator
    participant MCP as MCP Server
    participant DB as Supabase DB

    User->>App: Enters service request
    App->>API: POST /requests
    API->>O: Start workflow

    O->>MCP: extract_intent
    MCP->>DB: Save intent + trace

    O->>MCP: find_providers
    MCP->>DB: Query providers + slots

    O->>MCP: rank_providers
    MCP->>DB: Save ranking trace

    O->>MCP: create_booking
    MCP->>DB: Create booking + mark slot booked

    O->>MCP: schedule_followups
    MCP->>DB: Create reminder notifications

    API->>App: Return booking + trace data
```

## MCP Tools

| Tool                 | Purpose                                                 |
| -------------------- | ------------------------------------------------------- |
| `extract_intent`     | Extract service type, location, time, urgency, language |
| `find_providers`     | Find matching providers and available slots             |
| `rank_providers`     | Rank providers by rating, distance, and availability    |
| `create_booking`     | Create booking and confirmation code                    |
| `schedule_followups` | Schedule reminder and completion check                  |
| `write_trace_log`    | Save agent reasoning and tool outputs                   |

## Ranking Formula

```txt
score = 
  rating_score * 0.40 
  + proximity_score * 0.35 
  + availability_score * 0.25
```
