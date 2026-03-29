-- ============================================================================
-- BarberCloud AI - Seed Data for Citas (Appointments)
-- Run this AFTER 001_initial_schema.sql
-- This script dynamically finds the IDs created in 001 and inserts demo appointments for TODAY
-- ============================================================================

DO $$
DECLARE
  v_sucursal_id UUID;
  v_barbero_carlos UUID;
  v_barbero_miguel UUID;
  v_servicio_corte UUID;
  v_servicio_barba UUID;
  v_servicio_combo UUID;
  v_hoy DATE := CURRENT_DATE;
BEGIN
  -- 1. Find existing IDs (from 001_initial_schema.sql)
  -- We use LIKE to be safe if exact names vary slightly, but 001 uses explicit names.
  SELECT id INTO v_sucursal_id FROM sucursales LIMIT 1;
  
  SELECT id INTO v_barbero_carlos FROM barberos WHERE nombre LIKE 'Carlos%' LIMIT 1;
  SELECT id INTO v_barbero_miguel FROM barberos WHERE nombre LIKE 'Miguel%' LIMIT 1;
  
  SELECT id INTO v_servicio_corte FROM servicios WHERE nombre = 'Corte Clásico' LIMIT 1;
  SELECT id INTO v_servicio_barba FROM servicios WHERE nombre = 'Barba' LIMIT 1;
  SELECT id INTO v_servicio_combo FROM servicios WHERE nombre = 'Combo Completo' LIMIT 1;

  -- Verify we found the necessary data (Optional debug check)
  IF v_sucursal_id IS NULL THEN
    RAISE EXCEPTION 'No sucursal found. Did you run 001_initial_schema.sql?';
  END IF;

  -- 2. Insert Citas for TODAY
  -- Cita 1: Carlos Mendoza (En Proceso)
  INSERT INTO citas
    (sucursal_id, barbero_id, servicio_id, cliente_nombre, cliente_telefono, timestamp_inicio, timestamp_fin, origen, estado)
  VALUES
    (v_sucursal_id, v_barbero_carlos, v_servicio_corte, 'Carlos Mendoza', '+52 555 123 4567',
     (v_hoy || ' 10:00:00')::timestamp with time zone, 
     (v_hoy || ' 10:40:00')::timestamp with time zone, 
     'whatsapp', 'en_proceso');

  -- Cita 2: Roberto García (Confirmada)
  INSERT INTO citas
    (sucursal_id, barbero_id, servicio_id, cliente_nombre, cliente_telefono, timestamp_inicio, timestamp_fin, origen, estado)
  VALUES
    (v_sucursal_id, v_barbero_carlos, v_servicio_barba, 'Roberto García', '+52 555 987 6543',
     (v_hoy || ' 11:00:00')::timestamp with time zone, 
     (v_hoy || ' 11:30:00')::timestamp with time zone, 
     'whatsapp', 'confirmada');

  -- Cita 3: Miguel Torres (Walk-in En Espera)
  INSERT INTO citas
    (sucursal_id, barbero_id, servicio_id, cliente_nombre, cliente_telefono, timestamp_inicio, timestamp_fin, origen, estado)
  VALUES
    (v_sucursal_id, v_barbero_miguel, v_servicio_combo, 'Miguel Torres', '+52 555 456 7890',
     (v_hoy || ' 12:00:00')::timestamp with time zone, 
     (v_hoy || ' 13:00:00')::timestamp with time zone, 
     'walkin', 'en_espera');

END $$;
