import { NextResponse } from 'next/server'
import { validarDisponibilidad } from '@/lib/validations'
import { createServerClient } from '@/lib/supabase'

// Definimos la estructura esperada desde n8n
interface ValidateRequest {
    sucursalId: string
    barberoId: string
    servicioId: string // Used in future for detailed conflict checking if needed
    fecha: string      // YYYY-MM-DD
    hora: string       // HH:MM
    duracionMinutos: number
}

// Secret Token validation (opcional, pero fuertemente recomendado para asegurar el endpoint)
// Agrega NEXT_PUBLIC_N8N_API_KEY a tu .env.local
const N8N_API_KEY = process.env.NEXT_PUBLIC_N8N_API_KEY || 'default-n8n-secret-key'

export async function POST(request: Request) {
    try {
        // Valida autorización para evitar spam
        const authHeader = request.headers.get('authorization')
        if (authHeader !== `Bearer ${N8N_API_KEY}`) {
            return NextResponse.json({ error: 'Unauthorized. Invalid API Key.' }, { status: 401 })
        }

        const body: ValidateRequest = await request.json()

        // Validaciones básicas del body
        if (!body.sucursalId || !body.barberoId || !body.fecha || !body.hora || !body.duracionMinutos) {
            return NextResponse.json(
                { error: 'Faltan parámetros obligatorios: sucursalId, barberoId, fecha, hora, duracionMinutos.' },
                { status: 400 }
            )
        }

        // Construir el Date object combinando fecha y hora en formato ISO 8601 UTC / Local.
        // Asumiendo que `hora` y `fecha` vienen en la zona horaria del local (es-MX).
        const timestampInicio = new Date(`${body.fecha}T${body.hora}:00`)

        if (isNaN(timestampInicio.getTime())) {
            return NextResponse.json({ error: 'Formato de fecha u hora inválido.' }, { status: 400 })
        }

        // Ejecutar "Validación Triple"
        const result = await validarDisponibilidad(
            body.sucursalId,
            body.barberoId,
            timestampInicio,
            body.duracionMinutos
        )

        // Retornamos el resultado directamente a n8n para que procese el camino IF/ELSE
        return NextResponse.json(result, { status: 200 })

    } catch (error: any) {
        console.error('Error in /api/citas/validar:', error)
        return NextResponse.json(
            { error: 'Error interno del servidor durante la validación.', details: error.message },
            { status: 500 }
        )
    }
}
