import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { validarDisponibilidad } from '@/lib/validations'

interface AgendarRequest {
    sucursalId: string
    barberoId: string | null
    servicioId: string | null
    clienteNombre: string
    clienteTelefono: string
    origen?: 'whatsapp' | 'walkin'
    notas?: string
    // Fechas en formato ISO (UTC) o Fecha Local
    fecha: string      // YYYY-MM-DD
    hora: string       // HH:MM
    duracionMinutos: number
}

const N8N_API_KEY = process.env.NEXT_PUBLIC_N8N_API_KEY || 'default-n8n-secret-key'

export async function POST(request: Request) {
    try {
        // Valida autorización para evitar spam
        const authHeader = request.headers.get('authorization')
        if (authHeader !== `Bearer ${N8N_API_KEY}`) {
            return NextResponse.json({ error: 'Unauthorized. Invalid API Key.' }, { status: 401 })
        }

        const body: AgendarRequest = await request.json()

        // Validaciones básicas del body
        if (!body.sucursalId || !body.clienteNombre || !body.clienteTelefono || !body.fecha || !body.hora || !body.duracionMinutos) {
            return NextResponse.json(
                { error: 'Faltan parámetros obligatorios: sucursalId, clienteNombre, clienteTelefono, fecha, hora, duracionMinutos.' },
                { status: 400 }
            )
        }

        const timestampInicio = new Date(`${body.fecha}T${body.hora}:00`)
        const timestampFin = new Date(timestampInicio.getTime() + body.duracionMinutos * 60000)

        if (isNaN(timestampInicio.getTime())) {
            return NextResponse.json({ error: 'Formato de fecha u hora inválido.' }, { status: 400 })
        }

        // 1. Doble Check: Re-validar disponibilidad (Race Conditions)
        if (body.barberoId) {
            const result = await validarDisponibilidad(
                body.sucursalId,
                body.barberoId,
                timestampInicio,
                body.duracionMinutos
            )

            if (!result.valido) {
                return NextResponse.json(
                    { error: 'El espacio ya no está disponible (Race Condition).', details: result.mensaje },
                    { status: 409 } // Conflict
                )
            }
        }

        // Usar SUPABASE_SERVICE_ROLE_KEY para omitir RLS desde backend
        // Si no está, usa el Anon Key asumiendo configuraciones públicas.
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
        const supabase = createServerClient(supabaseUrl, supabaseKey)

        // 2. Construir e Insertar Cita
        const newCita = {
            sucursal_id: body.sucursalId,
            barbero_id: body.barberoId || null,
            servicio_id: body.servicioId || null,
            cliente_nombre: body.clienteNombre,
            cliente_telefono: body.clienteTelefono,
            timestamp_inicio: timestampInicio.toISOString(),
            timestamp_fin: timestampFin.toISOString(),
            origen: body.origen || 'whatsapp',
            estado: 'confirmada', // Status por defecto por WhatsApp
            notas: body.notas || null
        }

        // Force 'any' downcast for insert to bypass strong typing strictly for service role
        const { data, error } = await (supabase.from('citas') as any)
            .insert([newCita])
            .select()
            .single()

        if (error) {
            console.error('Error insertando cita:', error)
            return NextResponse.json({ error: 'Error al insertar en Supabase.', details: error.message }, { status: 500 })
        }

        // 3. Confirmar a n8n el éxito
        return NextResponse.json(
            { success: true, message: 'Cita agendada exitosamente', cita: data },
            { status: 201 }
        )

    } catch (error: any) {
        console.error('Error in /api/citas/agendar:', error)
        return NextResponse.json(
            { error: 'Error interno del servidor agendando cita.', details: error.message },
            { status: 500 }
        )
    }
}
