# Architecture Context

## Tech Stack

| Layer            | Technology          |
| ---------------- | ------------------- |
| Mobile App       | React Native + Expo |
| Backend API      | FastAPI             |
| Agent Runtime    | OpenAI Agents SDK   |
| Tool Layer       | MCP Server          |
| Database         | Supabase Postgres   |
| Auth             | Clerk               |
| Queue            | Celery + Redis      |
| Local Redis      | Docker Redis        |
| Production Redis | Upstash Redis       |
| Deployment       | Google Cloud Run    |
| Dev Workspace    | Google Antigravity  |

## High Level Architecture 

```mermaid
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
```

## Database Overview

```mermaid
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
```

## Backend Routes

| Method  | Route                                 | Purpose                    |
| ------- | ------------------------------------- | -------------------------- |
| `GET`   | `/health`                             | Health check               |
| `POST`  | `/requests`                           | Start full agent workflow  |
| `GET`   | `/requests/{session_id}`              | Get request/session result |
| `GET`   | `/requests/{session_id}/trace`        | Get agent trace logs       |
| `GET`   | `/requests/{session_id}/trace/export` | Export trace JSON          |
| `GET`   | `/providers`                          | List providers             |
| `GET`   | `/providers/{id}`                     | Provider details           |
| `POST`  | `/bookings`                           | Create manual booking      |
| `GET`   | `/bookings/{id}`                      | Booking receipt/status     |
| `POST`  | `/bookings/{id}/cancel`               | Cancel booking             |
| `POST`  | `/followups/trigger`                  | Demo trigger reminder      |
| `GET`   | `/me`                                 | Current user profile       |
| `GET`   | `/admin/traces`                       | Admin trace dashboard      |
| `GET`   | `/admin/sessions`                     | Admin sessions list        |
| `GET`   | `/admin/bookings`                     | Admin bookings list        |
| `GET`   | `/admin/providers`                    | Admin providers list       |
| `POST`  | `/admin/providers`                    | Add provider               |
| `PATCH` | `/admin/providers/{id}`               | Update provider            |

## Recommended Folder Structure 

```txt
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

frontend/
  app/
    auth/
    customer/
    admin/
  components/
    AgentCard.tsx
    ProviderCard.tsx
    BookingReceipt.tsx
    TraceTimeline.tsx
  lib/
    api.ts
    auth.ts
  constants/
    routes.ts
```
