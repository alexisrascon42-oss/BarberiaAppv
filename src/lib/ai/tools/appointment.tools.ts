import { DynamicTool } from '@langchain/core/tools'
import { getAISupabaseClient } from './business.tools'

/**
 * Busca un cliente por teléfono en Supabase. Si no existe, lo crea.
 * Retorna el cliente_id para vincularlo a la cita.
 */
export const makeBuscarOCrearClienteTool = (sucursalId: string) => {
    return new DynamicTool({
        name: 'BUSCAR_CLIENTE',
        description:
            'Busca o registra un cliente por teléfono. ' +
            'Input JSON: { "telefono": "...", "nombre": "..." }. ' +
            'Retorna el cliente_id que necesitarás en AGENDAR_CITA.',
        func: async (input: string) => {
            try {
                let args: { telefono?: string; nombre?: string } = {}
                try { args = JSON.parse(input) } catch { args = { telefono: input.trim() } }

                if (!args.telefono) return JSON.stringify({ error: 'Se requiere el teléfono.' })

                const supabase = getAISupabaseClient()

                const { data: existing } = await supabase
                    .from('clientes')
                    .select('id, nombre, total_citas, ultima_cita')
                    .eq('telefono', args.telefono)
                    .limit(1)
                    .maybeSingle()

                if (existing) {
                    return JSON.stringify({ encontrado: true, cliente: existing })
                }

                if (!args.nombre) {
                    return JSON.stringify({ encontrado: false, mensaje: 'Cliente nuevo. Se necesita nombre para registrarlo.' })
                }

                const { data: nuevo, error } = await supabase
                    .from('clientes')
                    .insert([{ nombre: args.nombre, telefono: args.telefono }])
                    .select('id, nombre')
                    .single()

                if (error) throw error
                return JSON.stringify({ encontrado: false, registrado: true, cliente: nuevo })
            } catch (error: any) {
                return `Error buscando cliente: ${error.message}`
            }
        }
    })
}

/**
 * Trae las citas activas del cliente con nombres resueltos.
 */
export const makeMisCitasTool = (sucursalId: string) => {
    return new DynamicTool({
        name: 'MIS_CITAS',
        description:
            'Trae las citas activas del cliente por su teléfono. ' +
            'Input: teléfono (string) o JSON con campo cliente_telefono. ' +
            'Devuelve citas con nombre de barbero y servicio.',
        func: async (input: string) => {
            try {
                let telefono = input.trim()
                try {
                    const parsed = JSON.parse(input)
                    telefono = parsed?.cliente_telefono ?? parsed?.telefono ?? telefono
                } catch { }

                const supabase = getAISupabaseClient()
                const { data, error } = await supabase
                    .from('citas')
                    .select(`
                        id, timestamp_inicio, timestamp_fin, estado, notas, origen,
                        cliente_nombre,
                        barberos!inner(nombre),
                        servicios!inner(nombre)
                    `)
                    .eq('sucursal_id', sucursalId)
                    .eq('cliente_telefono', telefono)
                    .not('estado', 'in', '("cancelada","ausente","finalizada")')
                    .order('timestamp_inicio')

                if (error) throw error
                if (!data?.length) return JSON.stringify({ mensaje: 'No tienes citas activas.' })

                // Aplanar el join de Supabase
                const flat = data.map((c: any) => ({
                    id: c.id,
                    barbero: (c.barberos as any)?.nombre,
                    servicio: (c.servicios as any)?.nombre,
                    cliente_nombre: c.cliente_nombre,
                    timestamp_inicio: c.timestamp_inicio,
                    timestamp_fin: c.timestamp_fin,
                    estado: c.estado,
                    notas: c.notas
                }))

                return JSON.stringify(flat)
            } catch (error: any) {
                return `Error consultando citas: ${error.message}`
            }
        }
    })
}

/**
 * Agenda una cita en Supabase. Incluye upsert de cliente.
 */
export const makeAgendarCitaTool = (sucursalId: string) => {
    return new DynamicTool({
        name: 'AGENDAR_CITA',
        description:
            'Agenda una cita. SOLO ejecutar tras confirmar: nombre, barbero, servicio, hora validada y disponibilidad. ' +
            'Input JSON: { barbero_id, servicio_id, cliente_nombre, cliente_telefono, timestamp_inicio (ISO), timestamp_fin (ISO) }.',
        func: async (input: string) => {
            try {
                const args = JSON.parse(input)
                const { barbero_id, servicio_id, cliente_nombre, cliente_telefono, timestamp_inicio, timestamp_fin } = args

                if (!barbero_id || !servicio_id || !cliente_nombre || !cliente_telefono || !timestamp_inicio || !timestamp_fin) {
                    return JSON.stringify({ error: 'Faltan campos requeridos: barbero_id, servicio_id, cliente_nombre, cliente_telefono, timestamp_inicio, timestamp_fin' })
                }

                const supabase = getAISupabaseClient()

                // Upsert cliente para CRM
                let clienteId: string | null = null
                try {
                    const { data: cl } = await supabase
                        .from('clientes')
                        .upsert({ nombre: cliente_nombre, telefono: cliente_telefono }, { onConflict: 'telefono' })
                        .select('id')
                        .single()
                    clienteId = cl?.id ?? null
                } catch { /* silenciar si clientes no tiene unique en telefono */ }

                // Insertar cita
                const { data, error } = await supabase
                    .from('citas')
                    .insert([{
                        sucursal_id: sucursalId,
                        barbero_id,
                        servicio_id,
                        cliente_nombre,
                        cliente_telefono,
                        cliente_id: clienteId,
                        timestamp_inicio: new Date(timestamp_inicio).toISOString(),
                        timestamp_fin: new Date(timestamp_fin).toISOString(),
                        estado: 'confirmada',
                        origen: 'whatsapp'
                    }])
                    .select('id, timestamp_inicio, timestamp_fin, estado')
                    .single()

                if (error) {
                    if (error.code === '23505' || error.message.includes('unique')) {
                        return JSON.stringify({
                            status: 'error',
                            error_code: 'SLOT_OCUPADO',
                            instruccion_para_agente: 'Ese horario acaba de ser tomado por otra persona. Discúlpate y ofrece buscar otro horario o barbero.'
                        })
                    }
                    throw error
                }

                return JSON.stringify({
                    status: 'ok',
                    cita_id: data.id,
                    timestamp_inicio: data.timestamp_inicio,
                    timestamp_fin: data.timestamp_fin,
                    estado: data.estado
                })
            } catch (error: any) {
                return JSON.stringify({ status: 'error', message: error.message })
            }
        }
    })
}

/**
 * Cancela una cita del cliente en Supabase.
 */
export const makeCancelarCitaTool = (sucursalId: string) => {
    return new DynamicTool({
        name: 'CANCELAR_CITA',
        description:
            'Cancela una cita del cliente. Solo puede cancelar citas del mismo número que escribe. ' +
            'Input JSON: { cita_id, cliente_telefono }. Obtén el cita_id con MIS_CITAS.',
        func: async (input: string) => {
            try {
                const args = JSON.parse(input)
                if (!args.cita_id || !args.cliente_telefono) {
                    return JSON.stringify({ error: 'Se requiere cita_id y cliente_telefono' })
                }

                const supabase = getAISupabaseClient()
                const { data, error } = await supabase
                    .from('citas')
                    .update({ estado: 'cancelada' })
                    .eq('id', args.cita_id)
                    .eq('sucursal_id', sucursalId)
                    .eq('cliente_telefono', args.cliente_telefono)
                    .select('id')

                if (error) throw error
                if (!data?.length) return JSON.stringify({ error: 'No se encontró esa cita o no te pertenece.' })
                return JSON.stringify({ status: 'ok', mensaje: 'Cita cancelada exitosamente.' })
            } catch (error: any) {
                return `Error cancelando cita: ${error.message}`
            }
        }
    })
}
