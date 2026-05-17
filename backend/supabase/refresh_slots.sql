-- refresh_slots.sql — Reset all provider slots to the next 3 days.
--
-- Run this in Supabase SQL Editor whenever you need fresh demo slots.
-- It deletes all existing unbooked slots and creates new ones for
-- CURRENT_DATE through CURRENT_DATE + 2 days for every active provider.
--
-- Booked slots (linked to bookings) are left untouched.

-- 1. Delete existing unbooked slots (booked slots are preserved)
DELETE FROM provider_slots WHERE is_booked = false;

-- 2. Create fresh slots for the next 3 days for ALL active providers
INSERT INTO provider_slots (provider_id, slot_date, slot_time, is_booked)
SELECT 
    p.id,
    d.slot_date,
    t.slot_time,
    false
FROM providers p
CROSS JOIN (
    SELECT CURRENT_DATE + interval '0 day' AS slot_date
    UNION ALL SELECT CURRENT_DATE + interval '1 day'
    UNION ALL SELECT CURRENT_DATE + interval '2 day'
) d
CROSS JOIN (
    VALUES ('09:00 AM'), ('10:30 AM'), ('12:00 PM'), ('02:00 PM'), ('04:00 PM')
) t(slot_time)
WHERE p.is_active = true
ON CONFLICT (provider_id, slot_date, slot_time) DO NOTHING;
