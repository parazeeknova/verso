-- Store guest Pokemon name and avatar for comments posted by guests
ALTER TABLE comments ADD COLUMN IF NOT EXISTS guest_name TEXT;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS guest_avatar TEXT;
