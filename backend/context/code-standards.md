# Code Standards

## General

- Agent trace visibility is the main priority, followed by booking logic.
- Do not overbuild maps, payments, chat, or real provider integrations in MVP.
- Add trace logging everywhere.

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

## MCP Tools

| Tool                 | Purpose                                                 |
| -------------------- | ------------------------------------------------------- |
| `extract_intent`     | Extract service type, location, time, urgency, language |
| `find_providers`     | Find matching providers and available slots             |
| `rank_providers`     | Rank providers by rating, distance, and availability    |
| `create_booking`     | Create booking and confirmation code                    |
| `schedule_followups` | Schedule reminder and completion check                  |
| `write_trace_log`    | Save agent reasoning and tool outputs                   |
