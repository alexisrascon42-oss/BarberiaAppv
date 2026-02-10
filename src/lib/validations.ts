import { createClient } from './supabase'
import type {
    ValidacionResultado,
    DiasSemana,
    HorarioApertura,
    HorarioLaboralSemana,
    BloqueAlmuerzo
} from './types'

// ============================================================================
// Helper: Get day of week in Spanish
// ============================================================================
function getDiaSemana(fecha: Date): DiasSemana {
    const dias: DiasSemana[] = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
    return dias[fecha.getDay()]
}

// ============================================================================
// Helper: Check if time is within a range
// ============================================================================
function dentroDeHorario(hora: string, horario?: { inicio?: string; fin?: string; apertura?: string; cierre?: string }): boolean {
    if (!horario) return false

    const inicio = horario.inicio || horario.apertura
    const fin = horario.fin || horario.cierre

    if (!inicio || !fin) return false

    return hora >= inicio && hora < fin
}

// ============================================================================
// Helper: Check if time overlaps with lunch block
// ============================================================================
function dentroDeBloqueAlmuerzo(horaInicio: string, horaFin: string, bloqueo: BloqueAlmuerzo): boolean {
    // Check if the appointment time range overlaps with lunch block
    return !(horaFin <= bloqueo.inicio || horaInicio >= bloqueo.fin)
}

// ============================================================================
// Helper: Check if two time ranges overlap
// ============================================================================
function hayOverlap(inicio1: Date, fin1: Date, inicio2: Date, fin2: Date): boolean {
    return inicio1 < fin2 && fin1 > inicio2
}

// ============================================================================
// Main Validation Function - Triple Cascade
// ============================================================================
export async function validarDisponibilidad(
    sucursalId: string,
    barberoId: string,
    timestampInicio: Date,
    duracionMinutos: number
): Promise<ValidacionResultado> {
    const supabase = createClient()
    const timestampFin = new Date(timestampInicio.getTime() + duracionMinutos * 60000)

    const diaSemana = getDiaSemana(timestampInicio)
    const horaInicio = timestampInicio.toTimeString().slice(0, 5)
    const horaFin = timestampFin.toTimeString().slice(0, 5)

    // ========================================================================
    // LEVEL 1: Validate branch hours
    // ========================================================================
    const { data: sucursal, error: sucursalError } = await supabase
        .from('sucursales')
        .select('horario_apertura, activa')
        .eq('id', sucursalId)
        .single()

    if (sucursalError || !sucursal) {
        return { valido: false, mensaje: 'Sucursal no encontrada' }
    }

    if (!sucursal.activa) {
        return { valido: false, mensaje: 'La sucursal no está activa' }
    }

    const horarioSucursal = sucursal.horario_apertura as HorarioApertura
    const horarioDia = horarioSucursal[diaSemana]

    if (!horarioDia) {
        return { valido: false, mensaje: `La sucursal no abre los ${diaSemana}` }
    }

    if (!dentroDeHorario(horaInicio, horarioDia) || !dentroDeHorario(horaFin, horarioDia)) {
        return {
            valido: false,
            mensaje: `Fuera del horario de la sucursal (${horarioDia.apertura} - ${horarioDia.cierre})`
        }
    }

    // ========================================================================
    // LEVEL 2: Validate barber schedule
    // ========================================================================
    const { data: barbero, error: barberoError } = await supabase
        .from('barberos')
        .select('horario_laboral, bloqueo_almuerzo, activo, nombre')
        .eq('id', barberoId)
        .single()

    if (barberoError || !barbero) {
        return { valido: false, mensaje: 'Barbero no encontrado' }
    }

    if (!barbero.activo) {
        return { valido: false, mensaje: 'El barbero no está activo' }
    }

    const horarioBarbero = barbero.horario_laboral as HorarioLaboralSemana
    const horarioLaboralDia = horarioBarbero[diaSemana]

    if (!horarioLaboralDia) {
        return { valido: false, mensaje: `${barbero.nombre} no trabaja los ${diaSemana}` }
    }

    if (!dentroDeHorario(horaInicio, horarioLaboralDia)) {
        return {
            valido: false,
            mensaje: `${barbero.nombre} trabaja de ${horarioLaboralDia.inicio} a ${horarioLaboralDia.fin}`
        }
    }

    // Check lunch block
    const bloqueoAlmuerzo = barbero.bloqueo_almuerzo as BloqueAlmuerzo | null
    if (bloqueoAlmuerzo && dentroDeBloqueAlmuerzo(horaInicio, horaFin, bloqueoAlmuerzo)) {
        return {
            valido: false,
            mensaje: `${barbero.nombre} está en hora de almuerzo (${bloqueoAlmuerzo.inicio} - ${bloqueoAlmuerzo.fin})`
        }
    }

    // ========================================================================
    // LEVEL 3: Check for overlapping appointments
    // ========================================================================
    const inicioDelDia = new Date(timestampInicio)
    inicioDelDia.setHours(0, 0, 0, 0)

    const finDelDia = new Date(timestampInicio)
    finDelDia.setHours(23, 59, 59, 999)

    const { data: citasExistentes, error: citasError } = await supabase
        .from('citas')
        .select('timestamp_inicio, timestamp_fin')
        .eq('barbero_id', barberoId)
        .neq('estado', 'cancelada')
        .neq('estado', 'no_show')
        .gte('timestamp_inicio', inicioDelDia.toISOString())
        .lte('timestamp_fin', finDelDia.toISOString())

    if (citasError) {
        console.error('Error checking appointments:', citasError)
        return { valido: false, mensaje: 'Error al verificar disponibilidad' }
    }

    for (const cita of citasExistentes || []) {
        const citaInicio = new Date(cita.timestamp_inicio)
        const citaFin = new Date(cita.timestamp_fin)

        if (hayOverlap(timestampInicio, timestampFin, citaInicio, citaFin)) {
            return {
                valido: false,
                mensaje: 'Ya hay una cita programada en ese horario'
            }
        }
    }

    // ========================================================================
    // LEVEL 4: Check for active blocks
    // ========================================================================
    const { data: bloqueosActivos, error: bloqueosError } = await supabase
        .from('bloqueos')
        .select('tipo, motivo')
        .eq('sucursal_id', sucursalId)
        .or(`barbero_id.eq.${barberoId},barbero_id.is.null`)
        .lte('fecha_inicio', timestampFin.toISOString())
        .gte('fecha_fin', timestampInicio.toISOString())

    if (bloqueosError) {
        console.error('Error checking blocks:', bloqueosError)
    }

    if (bloqueosActivos && bloqueosActivos.length > 0) {
        const bloqueo = bloqueosActivos[0]
        const tipoMensaje = {
            almuerzo: 'hora de almuerzo',
            vacaciones: 'vacaciones',
            dia_festivo: 'día festivo',
            emergencia: 'emergencia'
        }

        return {
            valido: false,
            mensaje: `No disponible por ${tipoMensaje[bloqueo.tipo] || bloqueo.tipo}${bloqueo.motivo ? `: ${bloqueo.motivo}` : ''}`
        }
    }

    // ========================================================================
    // All validations passed
    // ========================================================================
    return { valido: true }
}

// ============================================================================
// Find next available slots
// ============================================================================
export async function buscarAlternativas(
    sucursalId: string,
    barberoId: string,
    fechaBase: Date,
    duracionMinutos: number,
    cantidad: number = 3
): Promise<string[]> {
    const alternativas: string[] = []
    const horaActual = new Date(fechaBase)

    // Round to next 15-minute slot
    const minutos = horaActual.getMinutes()
    const siguienteSlot = Math.ceil(minutos / 15) * 15
    horaActual.setMinutes(siguienteSlot, 0, 0)

    let intentos = 0
    const maxIntentos = 48 // Check up to 12 hours (48 x 15min slots)

    while (alternativas.length < cantidad && intentos < maxIntentos) {
        horaActual.setMinutes(horaActual.getMinutes() + 15)
        intentos++

        const resultado = await validarDisponibilidad(
            sucursalId,
            barberoId,
            horaActual,
            duracionMinutos
        )

        if (resultado.valido) {
            alternativas.push(horaActual.toISOString())
        }
    }

    return alternativas
}
