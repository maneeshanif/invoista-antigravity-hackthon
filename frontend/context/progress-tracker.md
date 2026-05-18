# Progress Tracker

## Completed Tasks
- [x] Initial Project Setup
- [x] Architecture Planning
- [x] Break down `architecture.md` into `/context` directory

## Current Sprint Goal: Hackathon MVP
- [x] Backend: FastAPI structure initialization
- [x] Backend: Supabase schema and seed data
- [x] MCP Server: Tool implementations (`extract_intent`, `find_providers`, etc.)
- [x] Agents: Orchestrator flow development
- [x] Frontend: Project Initialization & Design System
- [x] Frontend: Clerk Authentication & Route Protection
- [x] Frontend: Home Page Implementation (AI Input, Categories, Provider List)
- [x] Integration: Wire frontend to backend APIs
- [x] Trace Logs: Implement visibility across the stack

## Feature Specifications
- [x] 01-project-initialization.md
- [x] 02-auth.md
- [x] 03-homepage.md
- [x] 05-wiring-backend-with-frontend.md
- [x] 06-notifications-and-polling.md

## Integration Wiring — Completed (05-wiring-backend-with-frontend.md)

### P0 — Critical (All Done ✅)
- [x] `frontend/.env` — Added `EXPO_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1`
- [x] `frontend/lib/api.ts` — API client with all typed interfaces & endpoints
- [x] `frontend/lib/useApi.ts` — Hook with auto-injected Clerk JWT token
- [x] `frontend/app/(tabs)/index.tsx` — Real `listProviders()` replacing mock data; `handleAIRequest` calls `POST /requests` and navigates with real `session_id`
- [x] `frontend/app/request/[id].tsx` — Real polling loop (`GET /requests/{id}` + `GET /requests/{id}/trace`) with 120s timeout, live trace steps, error/retry UI
- [x] `frontend/app/provider/[sessionId].tsx` — **NEW SCREEN** — Parses `exportSessionTrace`, fetches provider, shows "Why Recommended" + Agent Pipeline + "View Confirmed Booking" CTA

### P1 — High Priority (All Done ✅)
- [x] `frontend/app/booking/[id].tsx` — Fetches real booking via `GET /bookings/{id}`, displays confirmation code + provider details + status badge; Cancel via `POST /bookings/{id}/cancel`

### P2 — Admin (All Done ✅)
- [x] `frontend/app/admin/_layout.tsx` — Stack layout for admin screens
- [x] `frontend/app/admin/dashboard.tsx` — Stat cards (Sessions/Completed/Failed/Bookings/Providers/Traces), sessions list linking to trace detail, bookings list, pull-to-refresh
- [x] `frontend/app/admin/traces/[sessionId].tsx` — Timeline of TraceLog cards with step badges, collapsible JSON input/output payload viewer, duration chips, output summaries

### Root Layout
- [x] `frontend/app/_layout.tsx` — Registered all new routes: `request/[id]`, `provider/[id]`, `provider/[sessionId]`, `booking/[id]`, `admin`

## Endpoint → Screen Coverage

| Endpoint | Screen | Status |
|---|---|---|
| `POST /requests/` | Home → AI Input | ✅ |
| `GET /requests/{id}` | Thinking Screen (poll) | ✅ |
| `GET /requests/{id}/trace` | Thinking Screen | ✅ |
| `GET /requests/{id}/trace/export` | Provider Selection | ✅ |
| `GET /providers/` | Home Screen | ✅ |
| `GET /providers/{id}` | Provider Selection, Booking | ✅ |
| `GET /bookings/{id}` | Booking Confirmation | ✅ |
| `POST /bookings/{id}/cancel` | Booking Screen | ✅ |
| `GET /admin/sessions` | Admin Dashboard | ✅ |
| `GET /admin/bookings` | Admin Dashboard | ✅ |
| `GET /admin/providers` | Admin Dashboard | ✅ |
| `GET /admin/traces` | Admin Dashboard | ✅ |

## Open Questions / Risks
- [ ] Finalizing the exact prompt templates for the agents.
- [ ] Backend `me.py` uses hardcoded `user_id` — Clerk JWT not yet verified server-side (acceptable for hackathon).
- [ ] Device LAN testing: update `EXPO_PUBLIC_API_BASE_URL` to machine LAN IP when testing on physical device.
- [ ] `AIInput` component may need a `disabled` prop added if not already supported.
