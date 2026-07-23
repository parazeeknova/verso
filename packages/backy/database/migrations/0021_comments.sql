-- Comments: Document and inline discussion threads
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    selection TEXT,
    type TEXT NOT NULL DEFAULT 'page',
    resolved_at TIMESTAMPTZ,
    resolved_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    edited_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_comments_page ON comments (page_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments (parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_comments_workspace ON comments (workspace_id);
CREATE INDEX IF NOT EXISTS idx_comments_space ON comments (space_id);
