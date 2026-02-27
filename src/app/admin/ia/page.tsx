'use client'

import { useState, useEffect } from 'react'
import { createClient, formatError } from '@/lib/supabase'

export default function IAPage() {
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [config, setConfig] = useState({
        bot_activo: false,
        openai_api_key: '',
        evolution_api_url: '',
        evolution_api_key: '',
        evolution_instance_name: '',
        system_prompt: 'Eres el asistente virtual de BarberCloud, una barbería moderna. Tu trabajo es agendar citas por WhatsApp.\n\nEXTRACCIONES REQUERIDAS:\n1. Nombre del cliente\n2. Fecha solicitada (YYYY-MM-DD)\n3. Hora solicitada (HH:MM)\n4. Servicio (Corte, Barba, Combo)\n5. Barbero preferido (opcional)\n\nREGLAS:\n- Si algo no está claro, pregunta amablemente (máximo 2 veces)\n- Si no puedes ayudar, responde: "requiere_escalado": true\n- Detecta variaciones: "mañana", "el sábado"\n\nFORMATO DE RESPUESTA JSON:\n{\n  "nombre": "Juan Pérez",\n  "fecha": "2026-02-08",\n  "hora": "16:00",\n  "servicio": "Corte",\n  "barbero": "Carlos",\n  "requiere_aclaracion": false,\n  "mensaje_cliente": "¡Listo! Carlos te espera..."\n}'
    })

    // Fetch initial config for first branch
    useEffect(() => {
        const fetchConfig = async () => {
            try {
                // Get branch ID
                const { data: sucursal } = await supabase.from('sucursales').select('id').limit(1).single()
                if (!sucursal) return

                const { data, error } = await supabase
                    .from('configuracion_ia')
                    .select('*')
                    .eq('sucursal_id', sucursal.id)
                    .single()

                if (error && error.code !== 'PGRST116') { // PGRST116 = not found, which is fine initially
                    console.warn('Error fetching IA config:', formatError(error))
                }

                if (data) {
                    setConfig({
                        bot_activo: data.bot_activo || false,
                        openai_api_key: data.openai_api_key || '',
                        evolution_api_url: data.evolution_api_url || '',
                        evolution_api_key: data.evolution_api_key || '',
                        evolution_instance_name: data.evolution_instance_name || '',
                        system_prompt: data.system_prompt || config.system_prompt
                    })
                }
            } catch (err) {
                console.warn('Failed to fetch IA config:', formatError(err))
            } finally {
                setLoading(false)
            }
        }
        fetchConfig()
    }, [supabase])

    const handleSave = async () => {
        setSaving(true)
        try {
            const { data: sucursal } = await supabase.from('sucursales').select('id').limit(1).single()
            if (!sucursal) throw new Error('No branch found')

            const { error } = await supabase
                .from('configuracion_ia')
                .upsert({
                    sucursal_id: sucursal.id,
                    ...config,
                    updated_at: new Date().toISOString()
                })

            if (error) throw error

            alert('Configuración guardada exitosamente')
        } catch (err) {
            console.error('Save error:', formatError(err))
            alert(`Error al guardar: ${formatError(err)}`)
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return <div className="text-white">Cargando configuración de IA...</div>
    }

    return (
        <div className="space-y-6 max-w-4xl animate-fade-in">
            <header>
                <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Asistente IA Nativo</h1>
                <p className="text-slate-400">Configura la conexión de OpenAI y Evolution API para el agendado por WhatsApp.</p>
            </header>

            <div className="glass-card p-6 border border-slate-700/50">
                <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-700/50">
                    <div>
                        <h2 className="text-xl font-bold text-white">Estado del Agente</h2>
                        <p className="text-sm text-slate-400">Enciende o apaga el procesamiento automático de mensajes.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={config.bot_activo}
                            onChange={(e) => setConfig({ ...config, bot_activo: e.target.checked })}
                            className="sr-only peer"
                        />
                        <div className="w-14 h-7 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-purple-600"></div>
                        <span className="ml-3 text-sm font-medium text-white">{config.bot_activo ? 'Activo' : 'Pausado'}</span>
                    </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                            <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            OpenAI
                        </h3>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">API Key</label>
                            <input
                                type="password"
                                value={config.openai_api_key}
                                onChange={(e) => setConfig({ ...config, openai_api_key: e.target.value })}
                                placeholder="sk-..."
                                className="w-full bg-slate-800/50 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500 transition-colors"
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                            <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            Evolution API
                        </h3>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">URL Instancia Base</label>
                            <input
                                type="url"
                                value={config.evolution_api_url}
                                onChange={(e) => setConfig({ ...config, evolution_api_url: e.target.value })}
                                placeholder="https://api.tu-evolution.com"
                                className="w-full bg-slate-800/50 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500 transition-colors mb-3"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Global API Key</label>
                            <input
                                type="password"
                                value={config.evolution_api_key}
                                onChange={(e) => setConfig({ ...config, evolution_api_key: e.target.value })}
                                placeholder="Global API Key de Evolution"
                                className="w-full bg-slate-800/50 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500 transition-colors mb-3"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Nombre de la Instancia</label>
                            <input
                                type="text"
                                value={config.evolution_instance_name}
                                onChange={(e) => setConfig({ ...config, evolution_instance_name: e.target.value })}
                                placeholder="Ej. BarberCloudBot"
                                className="w-full bg-slate-800/50 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500 transition-colors"
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-700/50 mb-6">
                    <h3 className="text-lg font-semibold text-white mb-2">Comportamiento del Agente (System Prompt)</h3>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Instrucciones para GPT-4</label>
                        <textarea
                            value={config.system_prompt}
                            onChange={(e) => setConfig({ ...config, system_prompt: e.target.value })}
                            rows={12}
                            className="w-full bg-slate-800/50 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500 font-mono text-sm transition-colors"
                        />
                        <p className="text-xs text-slate-400 mt-2">
                            Asegúrate de pedir siempre el formato JSON en las respuestas para que la validación interna funcione.
                        </p>
                    </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-700/50">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {saving ? (
                            <>
                                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Guardando...
                            </>
                        ) : (
                            'Guardar Configuración'
                        )}
                    </button>
                </div>
            </div>
            
            <div className="glass-card p-6 border border-slate-700/50">
                <h3 className="text-lg font-semibold text-white mb-4">Información para Evolution API</h3>
                <p className="text-sm text-slate-300 mb-4">
                    Pega esta URL como tu Webhook en el panel de Evolution API (Eventos: <code className="bg-slate-800 px-1 rounded">messages.upsert</code>)
                </p>
                <div className="flex items-center gap-4 bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                    <code className="text-green-400 flex-1 break-all">
                        https://tu-dominio.com/api/webhook/evolution
                    </code>
                </div>
            </div>
        </div>
    )
}
