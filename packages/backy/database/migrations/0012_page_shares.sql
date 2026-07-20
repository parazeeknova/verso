CREATE TABLE IF NOT EXISTS page_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE UNIQUE,
    share_token TEXT NOT NULL UNIQUE,
    short_code TEXT UNIQUE,
    search_indexing BOOLEAN NOT NULL DEFAULT false,
    is_enabled BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_page_shares_token ON page_shares (share_token);
CREATE INDEX IF NOT EXISTS idx_page_shares_short_code ON page_shares (short_code);
