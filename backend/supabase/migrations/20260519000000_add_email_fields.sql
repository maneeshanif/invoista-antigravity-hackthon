-- Add email column to users and providers tables
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE providers ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- Update email for demo user
UPDATE users 
SET email = 'demo_user@example.com' 
WHERE id = '11111111-1111-1111-1111-111111111111';

-- Update email for demo providers
UPDATE providers 
SET email = 'provider_ali@example.com' 
WHERE id = '22222222-2222-2222-2222-222222222221';

UPDATE providers 
SET email = 'provider_cooltech@example.com' 
WHERE id = '22222222-2222-2222-2222-222222222222';

-- Populate a default email for any other providers
UPDATE providers 
SET email = lower(replace(name, ' ', '_')) || '@example.com' 
WHERE email IS NULL;
