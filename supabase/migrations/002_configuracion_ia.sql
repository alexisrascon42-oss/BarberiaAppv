-- ============================================================================
-- Migration 002: IA Configuration (Evolution + OpenAI Native)
-- ============================================================================

CREATE TABLE IF NOT EXISTS configuracion_ia (
  sucursal_id UUID PRIMARY KEY REFERENCES sucursales(id) ON DELETE CASCADE,
  openai_api_key TEXT,
  evolution_api_url TEXT,
  evolution_api_key TEXT,
  evolution_instance_name TEXT,
  system_prompt TEXT,
  bot_activo BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for storing conversation context so GPT-4 has memory
CREATE TABLE IF NOT EXISTS sesiones_whatsapp (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sucursal_id UUID REFERENCES sucursales(id) ON DELETE CASCADE,
  telefono_cliente VARCHAR(20) NOT NULL,
  historial_mensajes JSONB DEFAULT '[]'::jsonb, -- Array of messages like {"role": "user", "content": "Hola"}
  estado VARCHAR(20) CHECK (estado IN ('activo', 'cerrado')) DEFAULT 'activo',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance indices
CREATE INDEX IF NOT EXISTS idx_sesiones_telefono ON sesiones_whatsapp(telefono_cliente, estado);

-- Enable RLS
ALTER TABLE configuracion_ia ENABLE ROW LEVEL SECURITY;
ALTER TABLE sesiones_whatsapp ENABLE ROW LEVEL SECURITY;

-- Development bypass rules (replace with strict rules in production)
CREATE POLICY "Allow all for authenticated users" ON configuracion_ia FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON sesiones_whatsapp FOR ALL USING (true);
