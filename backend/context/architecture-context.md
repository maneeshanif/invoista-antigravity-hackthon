# Architecture Context

## Stack

| Layer            | Technology          |
| ---------------- | ------------------- |
| Backend API      | FastAPI             |
| Agent Runtime    | Google Gemini (GenAI SDK) |
| Tool Layer       | MCP Server          |
| Database         | Supabase Postgres   |
| Auth             | Clerk               |
| Queue            | Celery + Redis      |
| Local Redis      | Docker Redis        |
| Production Redis | Upstash Redis       |
| Deployment       | Google Cloud Run    |
| Dev Workspace    | Google Antigravity  |

## System Boundaries

- Agents do not directly call backend functions. All agent tools are exposed through an MCP server, making the system modular, reusable, and agent-native.

## High Level Architecture

flowchart TD
    U[User Mobile App<br/>React Native Expo] --> CL[Clerk Auth]
    U --> API[FastAPI Backend]

    API --> ORCH[Agent Orchestrator<br/>OpenAI Agents SDK]
    ORCH --> MCP_CLIENT[MCP Client]
    MCP_CLIENT --> MCP[MCP Server]

    MCP --> T1[extract_intent]
    MCP --> T2[find_providers]
    MCP --> T3[rank_providers]
    MCP --> T4[create_booking]
    MCP --> T5[schedule_followups]
    MCP --> T6[write_trace_log]

    T1 --> DB[(Supabase Postgres)]
    T2 --> DB
    T3 --> DB
    T4 --> DB
    T5 --> DB
    T6 --> DB

    T5 --> Q[Celery Queue]
    Q --> R[(Redis / Upstash)]
    Q --> W[Celery Worker]
    W --> DB

    AG[Google Antigravity] -.plan build test verify.-> API

## Agent Flow

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

## Database Overview

erDiagram
    USERS ||--o{ BOOKINGS : places
    USERS ||--o{ SESSIONS : starts
    USERS ||--o{ NOTIFICATIONS : receives
    PROVIDERS ||--o{ PROVIDER_SLOTS : has
    PROVIDERS ||--o{ BOOKINGS : fulfills
    PROVIDER_SLOTS ||--o| BOOKINGS : reserved_in
    BOOKINGS ||--o{ NOTIFICATIONS : triggers
    SESSIONS ||--|| INTENT_RESULTS : produces
    SESSIONS ||--o{ TRACE_LOGS : generates

    USERS {
        uuid id PK
        string clerk_user_id
        string name
        string phone
        string role
        string preferred_language
        string area
        float lat
        float lng
    }

    PROVIDERS {
        uuid id PK
        string name
        string category
        string area
        float lat
        float lng
        float rating
        int jobs_completed
        string price_range
        boolean is_active
    }

    PROVIDER_SLOTS {
        uuid id PK
        uuid provider_id FK
        date slot_date
        string slot_time
        boolean is_booked
    }

    BOOKINGS {
        uuid id PK
        uuid provider_id FK
        uuid user_id FK
        uuid slot_id FK
        string status
        string confirmation_code
        datetime booked_at
    }

    SESSIONS {
        uuid id PK
        uuid user_id FK
        string raw_input
        string detected_language
        string status
        datetime started_at
        datetime completed_at
    }

    INTENT_RESULTS {
        uuid id PK
        uuid session_id FK
        string service_type
        string location_text
        string time_preference
        string urgency
        json extracted_payload
    }

    TRACE_LOGS {
        uuid id PK
        uuid session_id FK
        int step
        string agent_name
        string tool_used
        json input_payload
        json output_payload
        string output_summary
        int duration_ms
    }

    NOTIFICATIONS {
        uuid id PK
        uuid booking_id FK
        uuid user_id FK
        string type
        string message
        datetime scheduled_at
        datetime sent_at
        string status
    }

## Ranking Formula

score =
rating_score * 0.40
+ proximity_score * 0.35
+ availability_score * 0.25

## Recommended Folder Structure 

backend/
  app/
    main.py
    core/
      config.py
      security.py
      celery_app.py
    db/
      session.py
      models.py
      schemas.py
    agents/
      orchestrator.py
      intent_agent.py
      discovery_agent.py
      ranking_agent.py
      booking_agent.py
      followup_agent.py
      prompts.py
      outputs.py
    api/
      routes/
        requests.py
        providers.py
        bookings.py
        traces.py
        admin.py
        me.py
    workers/
      tasks.py

  mcp_server/
    server.py
    tools/
      intent_tools.py
      provider_tools.py
      ranking_tools.py
      booking_tools.py
      notification_tools.py
      trace_tools.py
