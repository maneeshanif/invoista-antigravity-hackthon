-- HITL (Human-in-the-Loop) columns for booking approval flow
-- Stores serialised RunState and approval status between orchestration phases

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS hitl_state JSONB DEFAULT NULL;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS hitl_status TEXT DEFAULT NULL;
-- hitl_status values: 'pending_approval' | 'approved' | 'rejected' | null

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS provider_summary JSONB DEFAULT NULL;
-- Stores provider details for the frontend approval card
