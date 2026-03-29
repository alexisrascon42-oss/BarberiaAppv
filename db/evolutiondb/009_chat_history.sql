-- ============================================================================
-- Migration: 009_chat_history
-- ============================================================================

CREATE TABLE IF NOT EXISTS chat_histories (
  id BIGSERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,
  message JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookup by session_id
CREATE INDEX IF NOT EXISTS idx_chat_histories_session_id ON chat_histories(session_id);

-- RLS
ALTER TABLE chat_histories ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users (e.g., service role / admins) full access
CREATE POLICY "Allow full access to authenticated on chat_histories"
  ON chat_histories FOR ALL USING (true);
