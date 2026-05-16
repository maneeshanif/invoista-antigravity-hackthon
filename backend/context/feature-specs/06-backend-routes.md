# Feature 06 - Backend API Routes Specification

## Description

Implement the core backend API routes using FastAPI as defined in the system architecture. These routes will expose the agent workflow, provider discovery, booking capabilities, trace logs, and administrative interfaces to the client applications (e.g., the React Native app).

## Design

Organize the routes using FastAPI `APIRouter` to maintain a modular architecture. Create separate modules within the `app/api/routes/` directory based on the domain entities:

- **requests.py**: Handle incoming user requests and start the agent workflow.
    - `POST /requests`
    - `GET /requests/{session_id}`
- **traces.py**: Handle fetching agent reasoning trace logs.
    - `GET /requests/{session_id}/trace`
    - `GET /requests/{session_id}/trace/export`
- **providers.py**: Handle provider queries.
    - `GET /providers`
    - `GET /providers/{id}`
- **bookings.py**: Handle booking actions and receipts.
    - `POST /bookings`
    - `GET /bookings/{id}`
    - `POST /bookings/{id}/cancel`
- **followups.py**: Handle follow-up triggers for demo purposes.
    - `POST /followups/trigger`
- **me.py**: Handle user profile data.
    - `GET /me`
- **admin.py**: Handle administrative dashboards and management.
    - `GET /admin/traces`
    - `GET /admin/sessions`
    - `GET /admin/bookings`
    - `GET /admin/providers`
    - `POST /admin/providers`
    - `PATCH /admin/providers/{id}`

All route handlers should be strongly typed using Pydantic schemas (to be created in `app/db/schemas.py`). For the MVP, basic DB operations using the Supabase client are expected, but the primary focus is wiring the `POST /requests` route to the `AgentOrchestrator`.

## Implementation

1. **Schemas**: Define necessary request and response Pydantic schemas in `app/db/schemas.py`.
2. **Routers**: Create the individual route files in `app/api/routes/`.
3. **Orchestrator Integration**: Update `POST /requests` to initialize and run the `AgentOrchestrator` workflow. This can run as a background task if necessary, returning a `session_id` immediately.
4. **Registration**: Include all routers in the main `api_router` within `app/main.py` or `app/api/routes/__init__.py`.
5. **Database Interaction**: Utilize the Supabase Python client to interact with the database for fetching records like providers, bookings, and traces.

## Dependencies

- FastAPI
- Pydantic
- Existing `AgentOrchestrator` in `app/agents/orchestrator.py`
- Supabase Python client (`supabase`)

## Check When Done

- All 18 routes specified in `architecture.md` are implemented and accessible.
- `POST /requests` successfully triggers the agent orchestration flow.
- The Swagger UI (`/docs` or `/redoc`) displays all endpoints with appropriate input/output schemas.
- Route implementation adheres to the guidelines in `code-standards.md`.
