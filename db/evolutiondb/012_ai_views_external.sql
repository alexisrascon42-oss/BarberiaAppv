-- ============================================================================
-- Migration 012: Vistas SQL para facilitar lectura del Agente IA
-- BD: evolutiondb (PostgreSQL externo 18.216.112.9)
-- ============================================================================
-- EJECUTAR en la BD externa (evolutiondb), NO en Supabase.
-- Estas vistas facilitan que el agente reciba datos ya enriquecidos con nombres.
-- ============================================================================

-- Vista: Citas activas con nombres de barbero y servicio resueltos
-- Usada por MIS_CITAS para evitar joins manuales en el agente
CREATE OR REPLACE VIEW v_citas_activas AS
SELECT
    c.id,
    c.sucursal_id,
    c.barbero_id,
    b.nombre       AS barbero_nombre,
    c.servicio_id,
    s.nombre       AS servicio_nombre,
    s.duracion_minutos,
    c.cliente_id,
    c.cliente_nombre,
    c.cliente_telefono,
    c.timestamp_inicio,
    c.timestamp_fin,
    c.estado,
    c.origen,
    c.notas,
    c.created_at
FROM citas c
JOIN barberos b ON b.id = c.barbero_id
JOIN servicios s ON s.id = c.servicio_id
WHERE c.estado NOT IN ('cancelada', 'ausente', 'finalizada');

COMMENT ON VIEW v_citas_activas IS 'Citas activas enriquecidas con nombre de barbero y servicio. Usada por el agente IA.';

-- Vista: Barberos activos con datos completos
CREATE OR REPLACE VIEW v_barberos_activos AS
SELECT
    b.id,
    b.nombre,
    b.sucursal_id,
    b.horario_laboral,
    b.bloqueo_almuerzo,
    b.comision_porcentaje,
    b.estacion_id,
    b.activo
FROM barberos b
WHERE b.activo = true;

COMMENT ON VIEW v_barberos_activos IS 'Barberos activos de todas las sucursales. Filtrar por sucursal_id en las queries.';

-- Vista: Disponibilidad en tiempo real (para el Monitor del Panel Admin)
-- Muestra si cada barbero tiene cita en la próxima hora
CREATE OR REPLACE VIEW v_disponibilidad_ahora AS
SELECT
    b.id              AS barbero_id,
    b.nombre          AS barbero_nombre,
    b.sucursal_id,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM citas c
            WHERE c.barbero_id = b.id
              AND c.estado NOT IN ('cancelada','ausente')
              AND c.timestamp_inicio <= NOW() + INTERVAL '30 minutes'
              AND c.timestamp_fin >= NOW()
        ) THEN 'ocupado'
        ELSE 'disponible'
    END AS estado_actual,
    (
        SELECT MIN(c.timestamp_inicio)
        FROM citas c
        WHERE c.barbero_id = b.id
          AND c.estado NOT IN ('cancelada','ausente')
          AND c.timestamp_inicio > NOW()
    ) AS proxima_cita
FROM barberos b
WHERE b.activo = true;

COMMENT ON VIEW v_disponibilidad_ahora IS 'Estado actual de disponibilidad de cada barbero. Útil para el Panel de Monitor IA.';
