ALTER TABLE sessions ADD COLUMN IF NOT EXISTS device_name TEXT DEFAULT 'unknown device';
