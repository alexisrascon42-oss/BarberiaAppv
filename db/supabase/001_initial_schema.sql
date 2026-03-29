-- ============================================================================
-- BarberCloud AI - Complete Database Schema
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Table: sucursales (Branches)
-- ============================================================================
CREATE TABLE sucursales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre VARCHAR(100) NOT NULL,
  direccion TEXT,
  telefono_whatsapp VARCHAR(20) UNIQUE NOT NULL,
  horario_apertura JSONB NOT NULL, -- {"lunes":{"apertura":"09:00","cierre":"19:00"},...}
  activa BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- Table: barberos (Barbers)
-- ============================================================================
CREATE TABLE barberos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sucursal_id UUID REFERENCES sucursales(id) ON DELETE CASCADE,
  nombre VARCHAR(100) NOT NULL,
  estacion_id INTEGER NOT NULL,
  usuario_tablet VARCHAR(50) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  horario_laboral JSONB NOT NULL, -- {"lunes":{"inicio":"09:00","fin":"18:00"},...}
  bloqueo_almuerzo JSONB, -- {"inicio":"14:00","fin":"15:00"}
  activo BOOLEAN DEFAULT TRUE,
  hora_entrada TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(sucursal_id, estacion_id)
);

-- ============================================================================
-- Table: servicios (Services)
-- ============================================================================
CREATE TABLE servicios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sucursal_id UUID REFERENCES sucursales(id) ON DELETE CASCADE,
  nombre VARCHAR(100) NOT NULL,
  duracion_minutos INTEGER NOT NULL,
  precio DECIMAL(10,2) NOT NULL,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- Table: citas (Appointments)
-- ============================================================================
CREATE TABLE citas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sucursal_id UUID REFERENCES sucursales(id) ON DELETE CASCADE,
  barbero_id UUID REFERENCES barberos(id) ON DELETE CASCADE,
  servicio_id UUID REFERENCES servicios(id) ON DELETE SET NULL,
  cliente_nombre VARCHAR(100) NOT NULL,
  cliente_telefono VARCHAR(20) NOT NULL,
  timestamp_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
  timestamp_fin TIMESTAMP WITH TIME ZONE NOT NULL,
  origen VARCHAR(20) CHECK (origen IN ('whatsapp', 'walkin')) NOT NULL,
  estado VARCHAR(20) CHECK (estado IN ('confirmada','en_espera','en_proceso','finalizada','cancelada','no_show')) DEFAULT 'confirmada',
  notas TEXT,
  recordatorio_24h_enviado BOOLEAN DEFAULT FALSE,
  recordatorio_1h_enviado BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance indexes for citas
CREATE INDEX idx_citas_barbero_fecha ON citas(barbero_id, timestamp_inicio);
CREATE INDEX idx_citas_telefono ON citas(cliente_telefono);
CREATE INDEX idx_citas_estado ON citas(estado);
CREATE INDEX idx_citas_sucursal_fecha ON citas(sucursal_id, timestamp_inicio);

-- ============================================================================
-- Table: bloqueos (Blocks)
-- ============================================================================
CREATE TABLE bloqueos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbero_id UUID REFERENCES barberos(id) ON DELETE CASCADE, -- NULL = entire branch
  sucursal_id UUID REFERENCES sucursales(id) ON DELETE CASCADE,
  fecha_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
  fecha_fin TIMESTAMP WITH TIME ZONE NOT NULL,
  tipo VARCHAR(20) CHECK (tipo IN ('almuerzo','vacaciones','dia_festivo','emergencia')) NOT NULL,
  motivo TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- Table: usuarios_admin (Admin Users)
-- ============================================================================
CREATE TABLE usuarios_admin (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sucursal_id UUID REFERENCES sucursales(id) ON DELETE CASCADE,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  rol VARCHAR(20) CHECK (rol IN ('admin','secretaria')) NOT NULL,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) - CRITICAL FOR MULTI-TENANCY
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE sucursales ENABLE ROW LEVEL SECURITY;
ALTER TABLE barberos ENABLE ROW LEVEL SECURITY;
ALTER TABLE servicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE citas ENABLE ROW LEVEL SECURITY;
ALTER TABLE bloqueos ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios_admin ENABLE ROW LEVEL SECURITY;

-- For development: Allow all operations (REPLACE with proper policies in production)
-- These policies allow authenticated users to access all data for now

CREATE POLICY "Allow all for authenticated users" ON sucursales
  FOR ALL USING (true);

CREATE POLICY "Allow all for authenticated users" ON barberos
  FOR ALL USING (true);

CREATE POLICY "Allow all for authenticated users" ON servicios
  FOR ALL USING (true);

CREATE POLICY "Allow all for authenticated users" ON citas
  FOR ALL USING (true);

CREATE POLICY "Allow all for authenticated users" ON bloqueos
  FOR ALL USING (true);

CREATE POLICY "Allow all for authenticated users" ON usuarios_admin
  FOR ALL USING (true);

-- ============================================================================
-- REALTIME - Enable realtime for citas table
-- ============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE citas;

-- ============================================================================
-- TRIGGER: Auto-update updated_at on citas
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_citas_updated_at
    BEFORE UPDATE ON citas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================================================

-- Insert sample branch
INSERT INTO sucursales (nombre, direccion, telefono_whatsapp, horario_apertura) VALUES (
  'BarberCloud Principal',
  'Av. Reforma 123, CDMX',
  '+521234567890',
  '{
    "lunes": {"apertura": "09:00", "cierre": "20:00"},
    "martes": {"apertura": "09:00", "cierre": "20:00"},
    "miercoles": {"apertura": "09:00", "cierre": "20:00"},
    "jueves": {"apertura": "09:00", "cierre": "20:00"},
    "viernes": {"apertura": "09:00", "cierre": "20:00"},
    "sabado": {"apertura": "09:00", "cierre": "18:00"}
  }'::jsonb
);

-- Get the sucursal ID for subsequent inserts
DO $$
DECLARE
  sucursal_uuid UUID;
BEGIN
  SELECT id INTO sucursal_uuid FROM sucursales LIMIT 1;
  
  -- Insert sample barbers
  INSERT INTO barberos (sucursal_id, nombre, estacion_id, usuario_tablet, password_hash, horario_laboral, bloqueo_almuerzo) VALUES
  (sucursal_uuid, 'Carlos Hernández', 1, 'carlos01', '$2b$10$dummyhash1', 
   '{"lunes":{"inicio":"09:00","fin":"18:00"},"martes":{"inicio":"09:00","fin":"18:00"},"miercoles":{"inicio":"09:00","fin":"18:00"},"jueves":{"inicio":"09:00","fin":"18:00"},"viernes":{"inicio":"09:00","fin":"18:00"},"sabado":{"inicio":"09:00","fin":"15:00"}}'::jsonb,
   '{"inicio":"14:00","fin":"15:00"}'::jsonb),
  (sucursal_uuid, 'Miguel Ángel López', 2, 'miguel02', '$2b$10$dummyhash2',
   '{"lunes":{"inicio":"10:00","fin":"19:00"},"martes":{"inicio":"10:00","fin":"19:00"},"miercoles":{"inicio":"10:00","fin":"19:00"},"jueves":{"inicio":"10:00","fin":"19:00"},"viernes":{"inicio":"10:00","fin":"19:00"},"sabado":{"inicio":"10:00","fin":"16:00"}}'::jsonb,
   '{"inicio":"14:30","fin":"15:30"}'::jsonb);

  -- Insert sample services
  INSERT INTO servicios (sucursal_id, nombre, duracion_minutos, precio) VALUES
  (sucursal_uuid, 'Corte Clásico', 40, 250.00),
  (sucursal_uuid, 'Barba', 30, 150.00),
  (sucursal_uuid, 'Combo Completo', 60, 350.00),
  (sucursal_uuid, 'Corte + Diseño', 50, 300.00);

  -- Insert sample admin user
  INSERT INTO usuarios_admin (sucursal_id, nombre, email, password_hash, rol) VALUES
  (sucursal_uuid, 'Administrador', 'admin@barbercloud.com', '$2b$10$dummyadminhash', 'admin');

END $$;

-- ============================================================================
-- PRODUCTION RLS POLICIES (Uncomment when ready)
-- ============================================================================
/*
-- Drop development policies first
DROP POLICY IF EXISTS "Allow all for authenticated users" ON barberos;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON servicios;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON citas;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON bloqueos;

-- Create proper multi-tenant policies
CREATE POLICY "barberos_by_sucursal" ON barberos
  FOR ALL
  USING (sucursal_id IN (
    SELECT sucursal_id FROM usuarios_admin WHERE id = auth.uid()
    UNION
    SELECT sucursal_id FROM barberos WHERE id = auth.uid()
  ));

CREATE POLICY "servicios_by_sucursal" ON servicios
  FOR ALL
  USING (sucursal_id IN (
    SELECT sucursal_id FROM usuarios_admin WHERE id = auth.uid()
    UNION
    SELECT sucursal_id FROM barberos WHERE id = auth.uid()
  ));

CREATE POLICY "citas_by_sucursal" ON citas
  FOR ALL
  USING (sucursal_id IN (
    SELECT sucursal_id FROM usuarios_admin WHERE id = auth.uid()
    UNION
    SELECT sucursal_id FROM barberos WHERE id = auth.uid()
  ));

CREATE POLICY "bloqueos_by_sucursal" ON bloqueos
  FOR ALL
  USING (sucursal_id IN (
    SELECT sucursal_id FROM usuarios_admin WHERE id = auth.uid()
    UNION
    SELECT sucursal_id FROM barberos WHERE id = auth.uid()
  ));
*/
