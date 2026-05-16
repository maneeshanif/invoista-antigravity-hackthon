# Code Standards

## General

- Keep modules small and single-purpose.
- Fix root causes — do not layer workarounds.
- Do not mix unrelated concerns in one component or route.
- Respect the system boundaries defined in `architecture-context.md`.
- All agent tools must be exposed via the **MCP Server**.

## Python (FastAPI)

- Use Pydantic models for request/response validation.
- Follow PEP 8 style guidelines.
- Use asynchronous handlers (`async def`) for I/O bound operations.
- Keep the `api/routes` thin; move logic to `agents/` or `core/`.

## React Native (Expo)

- Use functional components and hooks.
- Use TypeScript for all components and utilities.
- Use Expo Router for navigation.
- Keep components focused on UI; move API calls to `lib/api.ts`.

## Database (Supabase / Postgres)

- Use migrations or clear SQL scripts for schema changes.
- Ensure all tables have appropriate primary and foreign keys.
- Use UUIDs for IDs where possible.

## Styling

- Use consistent styling (e.g., standard React Native `StyleSheet` or a chosen library like NativeWind if later decided).
- Maintain a clean, premium look as per "Main priority".

## File Organization

- `backend/` — FastAPI application.
- `mcp_server/` — Model Context Protocol server.
- `frontend/` — React Native Expo application.
- Name files after the responsibility they contain.
