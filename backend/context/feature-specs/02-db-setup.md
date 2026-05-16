Set up the Supabase Postgres database schema, including users, providers, provider slots, bookings, sessions, intent results, trace logs, and notifications.

## Design

Use Supabase Postgres as the primary database.
Define tables with appropriate constraints, primary keys (UUID), and foreign keys.

The following tables are required based on the architecture:
- `USERS`: Stores user profiles, roles, and location info. Syncs with Clerk `user_id`.
- `PROVIDERS`: Stores service providers, ratings, and location info.
- `PROVIDER_SLOTS`: Stores availability slots for providers.
- `BOOKINGS`: Manages booking states linking users, providers, and slots.
- `SESSIONS`: Tracks agent workflow sessions per user.
- `INTENT_RESULTS`: Stores the extracted intent from the initial agent step.
- `TRACE_LOGS`: Stores detailed step-by-step agent traces for debugging and the admin dashboard.
- `NOTIFICATIONS`: Stores scheduled reminders and follow-up checks.

## Implementation

Create SQL migration scripts or use Supabase Studio to define the schema.
Ensure coordinates (`lat`, `lng`) are stored as floats for the MVP.
Define proper constraints:
- `PROVIDER_SLOTS.is_booked` should be tracked accurately.
- Ensure foreign key constraints for data integrity.

Detailed Schema Breakdown:

**USERS**
- `id` (uuid, PK)
- `clerk_user_id` (string)
- `name` (string)
- `phone` (string)
- `role` (string)
- `preferred_language` (string)
- `area` (string)
- `lat` (float)
- `lng` (float)

**PROVIDERS**
- `id` (uuid, PK)
- `name` (string)
- `category` (string)
- `area` (string)
- `lat` (float)
- `lng` (float)
- `rating` (float)
- `jobs_completed` (int)
- `price_range` (string)
- `is_active` (boolean)

**PROVIDER_SLOTS**
- `id` (uuid, PK)
- `provider_id` (uuid, FK)
- `slot_date` (date)
- `slot_time` (string)
- `is_booked` (boolean)

**BOOKINGS**
- `id` (uuid, PK)
- `provider_id` (uuid, FK)
- `user_id` (uuid, FK)
- `slot_id` (uuid, FK)
- `status` (string)
- `confirmation_code` (string)
- `booked_at` (datetime)

**SESSIONS**
- `id` (uuid, PK)
- `user_id` (uuid, FK)
- `raw_input` (string)
- `detected_language` (string)
- `status` (string)
- `started_at` (datetime)
- `completed_at` (datetime)

**INTENT_RESULTS**
- `id` (uuid, PK)
- `session_id` (uuid, FK)
- `service_type` (string)
- `location_text` (string)
- `time_preference` (string)
- `urgency` (string)
- `extracted_payload` (json)

**TRACE_LOGS**
- `id` (uuid, PK)
- `session_id` (uuid, FK)
- `step` (int)
- `agent_name` (string)
- `tool_used` (string)
- `input_payload` (json)
- `output_payload` (json)
- `output_summary` (string)
- `duration_ms` (int)

**NOTIFICATIONS**
- `id` (uuid, PK)
- `booking_id` (uuid, FK)
- `user_id` (uuid, FK)
- `type` (string)
- `message` (string)
- `scheduled_at` (datetime)
- `sent_at` (datetime)
- `status` (string)

Set up initial seed data to support the main demo scenario: an AC technician required in G-13 tomorrow morning.

## Dependencies

- Supabase project
- psql / Supabase SQL Editor

## Check When Done

- All 8 tables are created with proper PK/FK constraints.
- Data types match the architecture specification.
- Initial seed data for the demo scenario (providers in G-13, slots, demo user) is present.
- Foreign keys cascade rules are properly reviewed (e.g., ON DELETE CASCADE where appropriate).
