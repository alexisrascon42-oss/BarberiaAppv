-- ============================================================================
-- evolutiondb Migration: 001_chat_history
-- BD DESTINO: PostgreSQL externo (18.216.112.9:5432/evolutiondb)
-- NO ejecutar en Supabase.
-- ============================================================================
-- Crea la tabla de historial de conversaciones compatible con:
-- @langchain/community/stores/message/postgres (PostgresChatMessageHistory)
-- El nombre n8n_chat_histories es el default del paquete y debe mantenerse.
-- ============================================================================

CREATE TABLE IF NOT EXISTS n8n_chat_histories (
  id          BIGSERIAL PRIMARY KEY,
  session_id  TEXT NOT NULL,
  message     JSONB NOT NULL,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_session_id ON n8n_chat_histories(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_created_at ON n8n_chat_histories(created_at);
