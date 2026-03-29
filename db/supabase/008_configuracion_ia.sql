-- ============================================================================
-- Migration: 008_configuracion_ia
-- ============================================================================

-- 1. Create 'configuracion_ia_global' table
CREATE TABLE IF NOT EXISTS configuracion_ia_global (
  id INTEGER PRIMARY KEY CHECK (id = 1), -- Ensure only one row exists
  evolution_api_url TEXT,
  evolution_api_key TEXT,
  openai_api_key TEXT,
  anthropic_api_key TEXT,
  model_default TEXT DEFAULT 'gpt-4o-mini',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert a default row if not exists
INSERT INTO configuracion_ia_global (id, model_default)
VALUES (1, 'gpt-4o-mini')
ON CONFLICT (id) DO NOTHING;

-- 2. Add AI Agent columns to 'sucursales'
ALTER TABLE sucursales ADD COLUMN IF NOT EXISTS agent_name TEXT DEFAULT 'BarberBot';
ALTER TABLE sucursales ADD COLUMN IF NOT EXISTS agent_personality TEXT DEFAULT 'Friendly';
ALTER TABLE sucursales ADD COLUMN IF NOT EXISTS agent_instance_name TEXT; -- Evolution API Instance Name
ALTER TABLE sucursales ADD COLUMN IF NOT EXISTS agent_evolution_key TEXT; -- Evolution API Key (Per Sucursal)
ALTER TABLE sucursales ADD COLUMN IF NOT EXISTS agent_prompt_override TEXT;
ALTER TABLE sucursales ADD COLUMN IF NOT EXISTS agent_enabled BOOLEAN DEFAULT FALSE;

-- 3. Row Level Security (RLS)
ALTER TABLE configuracion_ia_global ENABLE ROW LEVEL SECURITY;

-- Development policy: only authenticated admins can see/edit global settings
CREATE POLICY "Allow all for authenticated users" ON configuracion_ia_global
  FOR ALL USING (true);

-- Trigger for auto-updating updated_at for global config
CREATE TRIGGER update_configuracion_ia_global_updated_at
    BEFORE UPDATE ON configuracion_ia_global
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
