-- ============================================================================
-- Migration: 011_ai_providers
-- ============================================================================

-- Agregar llaves y opciones completas al panel Global para Desarrolladores
ALTER TABLE configuracion_ia_global 
ADD COLUMN IF NOT EXISTS anthropic_api_key TEXT,
ADD COLUMN IF NOT EXISTS groq_api_key TEXT,
ADD COLUMN IF NOT EXISTS default_provider TEXT DEFAULT 'openai',
ADD COLUMN IF NOT EXISTS openai_model TEXT DEFAULT 'gpt-4o-mini',
ADD COLUMN IF NOT EXISTS anthropic_model TEXT DEFAULT 'claude-3-haiku-20240307',
ADD COLUMN IF NOT EXISTS groq_model TEXT DEFAULT 'llama3-70b-8192';

-- Opciones granulares para cada Sucursal por separado
ALTER TABLE sucursales
ADD COLUMN IF NOT EXISTS agent_provider TEXT, -- 'openai', 'anthropic', 'groq', o nulo si hereda el global
ADD COLUMN IF NOT EXISTS agent_model TEXT;    -- Para que el desarrollador especifique el texto crudo del modelo
