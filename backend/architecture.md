# AI Service Marketplace — Project Overview

## Summary

This project is a multi-agent AI service marketplace that helps users book local services such as AC technicians, plumbers, electricians, tutors, and cleaners.

Users can enter requests in English, Urdu, or Roman Urdu. The system extracts intent, finds matching providers, ranks them, simulates booking, schedules follow-ups, and stores full trace logs for transparency.

Agents do not directly call backend functions. All agent tools are exposed through an MCP server, making the system modular, reusable, and agent-native.

---

## Core Idea

```txt
User request
  → Intent extraction
  → Provider discovery
  → Provider ranking
  → Booking simulation
  → Follow-up scheduling
  → Trace log visibility


## Tech stack

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


## MCP Tools

| Tool                 | Purpose                                                 |
| -------------------- | ------------------------------------------------------- |
| `extract_intent`     | Extract service type, location, time, urgency, language |
| `find_providers`     | Find matching providers and available slots             |
| `rank_providers`     | Rank providers by rating, distance, and availability    |
| `create_booking`     | Create booking and confirmation code                    |
| `schedule_followups` | Schedule reminder and completion check                  |
| `write_trace_log`    | Save agent reasoning and tool outputs                   |


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


## Frontend Routes

app/
  _layout.tsx
  index.tsx

  auth/
    sign-in.tsx
    sign-up.tsx

  customer/
    _layout.tsx
    home.tsx
    request.tsx
    thinking/[sessionId].tsx
    providers/[sessionId].tsx
    booking/[bookingId].tsx
    history.tsx
    profile.tsx

  admin/
    _layout.tsx
    dashboard.tsx
    traces.tsx
    traces/[sessionId].tsx
    bookings.tsx
    providers.tsx

# Page Layout Overview

## Customer Home

flowchart TD
    A[Header: AI Service Marketplace] --> B[Greeting Card]
    B --> C[Request Input Card]
    C --> D[Example Prompts]
    D --> E[Find Provider Button]
    E --> F[Recent Bookings]

## Request Screen

flowchart TD
    A[Service Request Form] --> B[Text Input]
    B --> C[Language Chips]
    C --> D[Location/Area Optional]
    D --> E[Submit Request]

## Agent Thinking Screen

flowchart TD
    A[Finding Best Provider] --> B[Intent Agent Card]
    B --> C[Discovery Agent Card]
    C --> D[Ranking Agent Card]
    D --> E[Booking Agent Card]
    E --> F[Follow-up Agent Card]
    F --> G[View Raw Trace JSON]

## Provider Selection Screen

flowchart TD
    A[Top Providers] --> B[Recommended Provider Card]
    A --> C[Alternative Provider Card]
    A --> D[Alternative Provider Card]
    B --> E[Why Recommended]
    E --> F[Book Now Button]

## Booking Confirmation Screen

flowchart TD
    A[Booking Confirmed] --> B[Receipt Card]
    B --> C[Provider Details]
    B --> D[Time Slot]
    B --> E[Confirmation Code]
    A --> F[Follow-up Timeline]
    F --> G[Reminder Scheduled]
    F --> H[Completion Check Scheduled]


## Admin Trace Dashboard


flowchart TD
    A[Admin Dashboard] --> B[Stats Cards]
    A --> C[Sessions Table]
    C --> D[Trace Detail Page]
    D --> E[Agent Timeline]
    D --> F[Tool Input/Output JSON]


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

## Main Demo Scenario

User input:
"Mujhe kal subah G-13 mein AC technician chahiye"

Expected result:
- Intent Agent extracts AC Technician, G-13, tomorrow morning
- Discovery Agent finds nearby AC technicians
- Ranking Agent selects best provider
- Booking Agent creates simulated booking
- Follow-up Agent schedules reminder
- Admin can inspect trace logs


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

## Sprint Goal

Build a balanced hackathon MVP with:

Strong agent backend
MCP-based tool architecture
Clean trace logs
Working booking simulation
Attractive mobile UI
Simple admin trace dashboard
Stable demo flow

## Antigravity Agent Instructions

Use this project context to:

1. Generate backend FastAPI structure
2. Generate MCP server tools
3. Generate agent orchestrator flow
4. Generate Supabase schema and seed data
5. Generate React Native Expo screens
6. Wire frontend routes to backend APIs
7. Add trace logging everywhere
8. Keep UI simple, clean, and demo-friendly

# Main priority:

Agent trace visibility > booking logic > UI polish > optional extras

Do not overbuild maps, payments, chat, or real provider integrations in MVP.


Also, one note: the earlier uploaded file has expired on my side, so I used the project plan from the chat context instead.

