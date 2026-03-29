-- ============================================================================
-- Migration: 010_request_logs
-- ============================================================================

CREATE TABLE IF NOT EXISTS ia_request_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sucursal_id UUID REFERENCES sucursales(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    phone TEXT NOT NULL,
    input_preview TEXT,
    output_preview TEXT,
    latency_ms INTEGER DEFAULT 0,
    tools_used JSONB DEFAULT '[]'::jsonb,
    error TEXT,
    source TEXT DEFAULT 'webhook',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indices para búsquedas de monitor rápidas por sucursal
CREATE INDEX idx_ia_logs_sucursal ON ia_request_logs(sucursal_id);
CREATE INDEX idx_ia_logs_session ON ia_request_logs(session_id);
CREATE INDEX idx_ia_logs_created ON ia_request_logs(created_at);

-- RLS
ALTER TABLE ia_request_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated
CREATE POLICY "Allow authenticated full access to ia_request_logs" ON ia_request_logs FOR ALL USING (true);
