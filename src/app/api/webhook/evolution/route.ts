import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { processWhatsAppMessage } from '@/lib/openai'
import { validarDisponibilidad, buscarAlternativas } from '@/lib/validations'

// ============================================================================
// Tipos esperados de Evolution API Webhook
// ============================================================================
interface EvolutionWebhookBody {
    event: string
    instance: string
    data: {
        key: {
            remoteJid: string // 521XXXXXXXXXX@s.whatsapp.net
            fromMe: boolean
            id: string
        }
        message?: {
            conversation?: string
            extendedTextMessage?: {
                text: string
            }
        }
        pushName?: string
        messageType: string
    }
}

// ============================================================================
// Helper para enviar mensaje respuesta via Evolution API
// ============================================================================
async function sendEvolutionMessage(apiUrl: string, apiKey: string, instanceName: string, number: string, text: string) {
    const endpoint = `${apiUrl}/message/sendText/${instanceName}`
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': apiKey
            },
            body: JSON.stringify({
                number: number,
                text: text,
                delay: 1500 // Human-like typing delay
            })
        })
        
        if (!response.ok) {
            console.error('Failed to send Evolution message:', await response.text())
        }
    } catch(err) {
        console.error('Evolution API Network Error:', err)
    }
}

// ============================================================================
// Main Webhook Handler
// ============================================================================
export async function POST(request: Request) {
    try {
        const body: EvolutionWebhookBody = await request.json()

        // 1. Filtrar solo mensajes entrantes nuevos (textos)
        if (body.event !== 'messages.upsert' || body.data.key.fromMe) {
            return NextResponse.json({ status: 'ignored' }, { status: 200 })
        }

        const remoteJid = body.data.key.remoteJid
        if (remoteJid.includes('@g.us')) {
            // Ignorar grupos
            return NextResponse.json({ status: 'ignored_group' }, { status: 200 })
        }

        const phoneNumber = remoteJid.split('@')[0]
        const incomingText = body.data.message?.conversation || body.data.message?.extendedTextMessage?.text

        if (!incomingText) {
            return NextResponse.json({ status: 'no_text' }, { status: 200 })
        }

        // ====================================================================
        // 2. Conectar a BD y buscar Configuración de la Instancia
        // ====================================================================
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
        const supabase = createServerClient(supabaseUrl, supabaseKey)

        const { data: config, error: configError } = await supabase
            .from('configuracion_ia')
            .select('sucursal_id, openai_api_key, evolution_api_url, evolution_api_key, system_prompt, bot_activo')
            .eq('evolution_instance_name', body.instance)
            .single()

        if (configError || !config) {
            console.warn(`No IA config found for instance: ${body.instance}`)
            return NextResponse.json({ error: 'Instance not configured' }, { status: 404 })
        }

        if (!config.bot_activo) {
            return NextResponse.json({ status: 'bot_paused' }, { status: 200 })
        }

        // ====================================================================
        // 3. Recuperar Memoria de Sesión (Chat History)
        // ====================================================================
        let sessionError = false
        const { data: sessionData } = await supabase
            .from('sesiones_whatsapp')
            .select('id, historial_mensajes')
            .eq('telefono_cliente', phoneNumber)
            .eq('sucursal_id', config.sucursal_id)
            .eq('estado', 'activo')
            .single()

        let chatHistory = []
        let sessionId = null

        if (sessionData) {
            chatHistory = typeof sessionData.historial_mensajes === 'string' 
                ? JSON.parse(sessionData.historial_mensajes) 
                : sessionData.historial_mensajes || []
            sessionId = sessionData.id
        } else {
            // Crear nueva sesión
            const { data: newSession } = await supabase
                .from('sesiones_whatsapp')
                .insert([{
                    sucursal_id: config.sucursal_id,
                    telefono_cliente: phoneNumber,
                    historial_mensajes: []
                }])
                .select('id')
                .single()
            
            if (newSession) sessionId = newSession.id
        }

        // ====================================================================
        // 4. Procesar con OpenAI
        // ====================================================================
        const { intent, newHistory } = await processWhatsAppMessage(
            { apiKey: config.openai_api_key, systemPrompt: config.system_prompt },
            chatHistory,
            incomingText
        )

        // Guardar nuevo historial
        if (sessionId && !intent.error_parsing) {
            // Keep last 10 messages max to save tokens
            const finalHistory = newHistory.length > 10 ? newHistory.slice(newHistory.length - 10) : newHistory
            await supabase
                .from('sesiones_whatsapp')
                .update({ 
                    historial_mensajes: finalHistory,
                    updated_at: new Date().toISOString()
                })
                .eq('id', sessionId)
        }

        // ====================================================================
        // 5. Lógica de Agendado (Validación DB) vs Aclaración (Responder)
        // ====================================================================
        
        let responseText = intent.mensaje_cliente || intent.pregunta || "Lo siento, ¿puedes repetirlo?"

        if (!intent.requiere_aclaracion && intent.fecha && intent.hora && intent.servicio) {
            // Intentar agendar
            try {
                // Formar fecha
                const timestampInicio = new Date(`${intent.fecha}T${intent.hora}:00`)
                
                // NOTA: Para un MVP asume duración de 45 mins. 
                // Idealmente, se buscaría en la BD el duracion_minutos del servicio extraido (intent.servicio)
                const duracionMinutos = 45 

                // Resolve Barbero ID (Si viene nombre, hay que buscar su UUID)
                let barberoId = null
                if (intent.barbero) {
                     const { data: bData } = await supabase
                        .from('barberos')
                        .select('id')
                        .eq('sucursal_id', config.sucursal_id)
                        .ilike('nombre', `%${intent.barbero}%`)
                        .eq('activo', true)
                        .limit(1)
                        .single()
                    if (bData) barberoId = bData.id
                } else {
                    // Si no pidió barbero, asignamos al primero disponible o dejamos en NULL (toda la sucursal)
                     const { data: bData } = await supabase
                        .from('barberos')
                        .select('id')
                        .eq('sucursal_id', config.sucursal_id)
                        .eq('activo', true)
                        .limit(1)
                        .single()
                    if (bData) barberoId = bData.id
                }

                if (!barberoId) {
                    responseText = "No encontré barberos disponibles en esta sucursal."
                } else {
                    // Validar
                    const result = await validarDisponibilidad(config.sucursal_id, barberoId, timestampInicio, duracionMinutos)

                    if (result.valido) {
                        // TODO: Map string service name to real ID from DB here, hardcoded null for MVP insert to survive foreign keys
                        const timestampFin = new Date(timestampInicio.getTime() + duracionMinutos * 60000)

                         // INSERTAR EN LA BD!
                        const { error: insertError } = await (supabase.from('citas') as any).insert([{
                            sucursal_id: config.sucursal_id,
                            barbero_id: barberoId,
                            servicio_id: null, 
                            cliente_nombre: intent.nombre || body.data.pushName || 'Cliente WhatsApp',
                            cliente_telefono: phoneNumber,
                            timestamp_inicio: timestampInicio.toISOString(),
                            timestamp_fin: timestampFin.toISOString(),
                            origen: 'whatsapp',
                            estado: 'confirmada'
                        }])

                        if (!insertError) {
                            responseText = intent.mensaje_cliente || `¡Listo! Tu cita para ${intent.servicio} el ${intent.fecha} a las ${intent.hora} está confirmada. ¡Te esperamos!`
                            
                            // Close Session after booking successful
                            if (sessionId) {
                                await supabase.from('sesiones_whatsapp').update({ estado: 'cerrado' }).eq('id', sessionId)
                            }
                        } else {
                            console.error('Insert error', insertError)
                            responseText = "Hubo un error interno al guardar tu cita. Por favor intenta de nuevo en unos minutos."
                        }
                    } else {
                        // SUGERIR ALTERNATIVAS
                        responseText = `Lo siento, ese horario no está disponible (${result.mensaje}). ¿Qué tal otra hora u otro día libre?`
                    }
                }
            } catch(e) {
                console.error("Booking Logic Error", e)
                responseText = "Ups, tuve un problema procesando la fecha y hora. ¿Me lo explicas de nuevo?"
            }
        }

        // 6. Enviar Respuesta via Evolution
        await sendEvolutionMessage(
            config.evolution_api_url,
            config.evolution_api_key,
            body.instance,
            remoteJid,
            responseText
        )

        return NextResponse.json({ status: 'processed' }, { status: 200 })

    } catch (error: any) {
        console.error('Webhook Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
