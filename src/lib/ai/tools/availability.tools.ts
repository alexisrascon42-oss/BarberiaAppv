import { DynamicTool } from '@langchain/core/tools'
import { getAISupabaseClient } from './business.tools'
import { TimeValidator } from './time-validator.tool'

/**
 * Validador de hora stateless.
 * Verifica que la hora esté a 15+ minutos en el futuro.
 */
export const makeValidarHoraTool = (timezone: string = 'America/Hermosillo') => {
    return new DynamicTool({
        name: 'VALIDAR_HORA',
        description:
            'Valida si una hora solicitada es válida (al menos 15 min en el futuro). ' +
            'SIEMPRE llamar antes de consultar disponibilidad. ' +
            'Input: string de hora (ej: "14:30", "2:30 PM") o JSON con campo hora_solicitada.',
        func: async (input: string) => {
            try {
                let hora_solicitada = input.trim()
                try {
                    const parsed = JSON.parse(input)
                    if (parsed?.hora_solicitada) hora_solicitada = parsed.hora_solicitada
                } catch { }

                const formatter = new Intl.DateTimeFormat('es-MX', {
                    timeZone: timezone,
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                })
                const hora_actual = formatter.format(new Date())
                const result = TimeValidator.validate({ hora_actual, hora_solicitada })
                return JSON.stringify(result)
            } catch (error: any) {
                return `Error validando hora: ${error.message}`
            }
        }
    })
}

/**
 * Verifica disponibilidad de todos los barberos en Supabase
 * cruzando citas activas y bloqueos.
 */
const makeDisponibilidadBase = (sucursalId: string, toolName: string, description: string) => {
    return new DynamicTool({
        name: toolName,
        description,
        func: async (input: string) => {
            try {
                let slot_inicio = input.trim()
                try {
                    const parsed = JSON.parse(input)
                    slot_inicio = parsed?.slot_inicio ?? parsed?.fecha_hora ?? slot_inicio
                } catch { }

                const localSlot = slot_inicio.replace(/([+-]\d{2}:\d{2}|Z)$/, '')
                const dateStart = new Date(localSlot)
                if (isNaN(dateStart.getTime())) {
                    return JSON.stringify({ error: `Formato inválido: "${slot_inicio}". Usa ISO sin zona (ej: 2025-03-29T14:30:00)` })
                }
                const dateEnd = new Date(dateStart.getTime() + 30 * 60000)

                const supabase = getAISupabaseClient()

                // 1. Barberos activos
                const { data: barberos, error: bError } = await supabase
                    .from('barberos')
                    .select('id, nombre, horario_laboral')
                    .eq('sucursal_id', sucursalId)
                    .eq('activo', true)

                if (bError || !barberos) return JSON.stringify({ error: bError?.message || 'Error obteniendo barberos' })

                // 2. Citas que se solapan
                const { data: citasBusy } = await supabase
                    .from('citas')
                    .select('barbero_id')
                    .eq('sucursal_id', sucursalId)
                    .neq('estado', 'cancelada')
                    .lt('timestamp_inicio', dateEnd.toISOString())
                    .gt('timestamp_fin', dateStart.toISOString())

                // 3. Bloqueos que se solapan
                const { data: bloqueosBusy } = await supabase
                    .from('bloqueos')
                    .select('barbero_id')
                    .eq('sucursal_id', sucursalId)
                    .lt('fecha_inicio', dateEnd.toISOString())
                    .gt('fecha_fin', dateStart.toISOString())

                const busyIds = new Set<string>([
                    ...(citasBusy ?? []).map((r: any) => r.barbero_id),
                    ...(bloqueosBusy ?? []).map((r: any) => r.barbero_id).filter(Boolean),
                ])

                const resultRows = barberos.map((b: any) => ({
                    id: b.id,
                    nombre: b.nombre,
                    estado: busyIds.has(b.id) ? 'ocupado' : 'disponible'
                }))

                return JSON.stringify({
                    slot_revisado: dateStart.toISOString(),
                    slot_fin: dateEnd.toISOString(),
                    barberos: resultRows
                })
            } catch (error: any) {
                return `Error verificando disponibilidad: ${error.message}`
            }
        }
    })
}

export const makeDisponibilidadHoyTool = (sucursalId: string, timezone: string = 'America/Hermosillo') =>
    makeDisponibilidadBase(
        sucursalId,
        'DISPONIBILIDAD_HOY',
        'Usa cuando la fecha es HOY. Devuelve barberos disponibles/ocupados para un slot. ' +
        'Input: ISO sin zona (ej: 2025-03-29T14:30:00) o JSON con campo slot_inicio.'
    )

export const makeDisponibilidadOtroDiaTool = (sucursalId: string, timezone: string = 'America/Hermosillo') =>
    makeDisponibilidadBase(
        sucursalId,
        'DISPONIBILIDAD_OTRO_DIA',
        'Usa cuando la fecha NO es hoy. Devuelve barberos disponibles/ocupados para un slot. ' +
        'Input: ISO sin zona (ej: 2025-03-30T10:00:00) o JSON con campo slot_inicio.'
    )
