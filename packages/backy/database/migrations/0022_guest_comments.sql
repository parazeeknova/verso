-- Allow NULL creator_id for guest comments on publicly shared pages
ALTER TABLE comments ALTER COLUMN creator_id DROP NOT NULL;
