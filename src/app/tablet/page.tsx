'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { CitaCard } from '@/components/CitaCard'
import { AgendaTimeline } from '@/components/AgendaTimeline'
import type { CitaConRelaciones } from '@/lib/types'

export default function TabletDashboard() {
    const router = useRouter()
    const [citas, setCitas] = useState<CitaConRelaciones[]>([])
    const [loading, setLoading] = useState(true)
    const [currentTime, setCurrentTime] = useState(new Date())
    const [barbero, setBarbero] = useState<{ id: string, nombre: string, estacion_id: number } | null>(null)

    const supabase = createClient()

    // Auth Check
    useEffect(() => {
        const sessionStr = localStorage.getItem('barbero_session')
        if (!sessionStr) {
            router.push('/tablet/login')
            return
        }
        try {
            const session = JSON.parse(sessionStr)
            setBarbero(session)
        } catch {
            router.push('/tablet/login')
        }
    }, [router])

    const cargarCitas = useCallback(async () => {
        if (!barbero?.id) return

        const hoy = new Date()
        const inicioDelDia = new Date(hoy.setHours(0, 0, 0, 0)).toISOString()
        const finDelDia = new Date(hoy.setHours(23, 59, 59, 999)).toISOString()

        try {
            const { data, error } = await supabase
                .from('citas')
                .select(`
          *,
          servicio:servicios(*)
        `)
                .eq('barbero_id', barbero.id) // Filter by logged in barber
                .gte('timestamp_inicio', inicioDelDia)
                .lte('timestamp_inicio', finDelDia)
                .neq('estado', 'cancelada')
                .order('timestamp_inicio', { ascending: true })

            if (error) {
                console.error('Error loading appointments:', error)
                // Use demo data if Supabase not configured (and matches barber roughly)
                // In production we would just show empty or error
                setCitas([])
            } else {
                setCitas(data || [])
            }
        } catch (err) {
            console.error('Supabase not configured:', err)
            setCitas([])
        } finally {
            setLoading(false)
        }
    }, [supabase, barbero])

    // Load appointments and set up real-time subscription
    useEffect(() => {
        if (!barbero) return

        cargarCitas()

        // Real-time subscription
        const channel = supabase
            .channel(`citas-barbero-${barbero.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'citas',
                    filter: `barbero_id=eq.${barbero.id}` // Only listen for this barber
                },
                (payload) => {
                    console.log('Real-time change:', payload)
                    cargarCitas()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [cargarCitas, supabase, barbero])

    // Update current time every minute
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(new Date())
        }, 60000)

        return () => clearInterval(interval)
    }, [])

    const citasActivas = citas.filter(c =>
        c.estado !== 'finalizada' && c.estado !== 'cancelada' && c.estado !== 'no_show'
    )

    const citaEnProceso = citas.find(c => c.estado === 'en_proceso')
    const citasSiguientes = citasActivas.filter(c => c.estado !== 'en_proceso')

    return (
        <div className="min-h-screen bg-slate-900 text-white">
            {/* Header */}
            <header className="bg-slate-800/50 backdrop-blur-xl border-b border-slate-700/50 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-purple-400 flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold">{barbero?.nombre || 'Cargando...'}</h1>
                            <p className="text-sm text-slate-400">
                                Estación {barbero?.estacion_id} • {currentTime.toLocaleDateString('es-MX', {
                                    weekday: 'long',
                                    day: 'numeric',
                                    month: 'long'
                                })}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="text-right hidden md:block">
                            <p className="text-3xl font-bold tabular-nums">
                                {currentTime.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <p className="text-sm text-slate-400">{citasActivas.length} citas pendientes</p>
                        </div>
                        <button
                            onClick={() => {
                                localStorage.removeItem('barbero_session')
                                router.push('/tablet/login')
                            }}
                            className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                            title="Cerrar Sesión"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Timeline - Left Column */}
                    <div className="lg:col-span-1">
                        <div className="glass-card p-4">
                            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Línea del Tiempo
                            </h2>
                            <AgendaTimeline citas={citas} currentTime={currentTime} />
                        </div>
                    </div>

                    {/* Appointments - Right Columns */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Current Appointment */}
                        {citaEnProceso && (
                            <div>
                                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    En Proceso
                                </h2>
                                <CitaCard cita={citaEnProceso} onUpdate={cargarCitas} isHighlighted />
                            </div>
                        )}

                        {/* Upcoming Appointments */}
                        <div>
                            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                                Próximas Citas ({citasSiguientes.length})
                            </h2>

                            {loading ? (
                                <div className="glass-card p-12 flex items-center justify-center">
                                    <div className="spinner w-8 h-8" />
                                </div>
                            ) : citasSiguientes.length === 0 ? (
                                <div className="glass-card p-12 text-center">
                                    <svg className="w-12 h-12 text-slate-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <p className="text-slate-500">No hay más citas programadas</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {citasSiguientes.map((cita, index) => (
                                        <CitaCard
                                            key={cita.id}
                                            cita={cita}
                                            onUpdate={cargarCitas}
                                            style={{ animationDelay: `${index * 100}ms` }}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}

// Demo data for when Supabase is not configured
function getDemoData(): CitaConRelaciones[] {
    const now = new Date()
    const baseHour = now.getHours()

    return [
        {
            id: '1',
            sucursal_id: '1',
            barbero_id: '1',
            servicio_id: '1',
            cliente_nombre: 'Carlos Mendoza',
            cliente_telefono: '+52 555 123 4567',
            timestamp_inicio: new Date(now.setHours(baseHour, 0, 0, 0)).toISOString(),
            timestamp_fin: new Date(now.setHours(baseHour, 40, 0, 0)).toISOString(),
            origen: 'whatsapp',
            estado: 'en_proceso',
            notas: null,
            recordatorio_24h_enviado: true,
            recordatorio_1h_enviado: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            servicio: {
                id: '1',
                sucursal_id: '1',
                nombre: 'Corte Clásico',
                duracion_minutos: 40,
                precio: 250,
                activo: true,
                created_at: new Date().toISOString()
            }
        },
        {
            id: '2',
            sucursal_id: '1',
            barbero_id: '1',
            servicio_id: '2',
            cliente_nombre: 'Roberto García',
            cliente_telefono: '+52 555 987 6543',
            timestamp_inicio: new Date(now.setHours(baseHour + 1, 0, 0, 0)).toISOString(),
            timestamp_fin: new Date(now.setHours(baseHour + 1, 30, 0, 0)).toISOString(),
            origen: 'whatsapp',
            estado: 'confirmada',
            notas: null,
            recordatorio_24h_enviado: true,
            recordatorio_1h_enviado: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            servicio: {
                id: '2',
                sucursal_id: '1',
                nombre: 'Barba',
                duracion_minutos: 30,
                precio: 150,
                activo: true,
                created_at: new Date().toISOString()
            }
        },
        {
            id: '3',
            sucursal_id: '1',
            barbero_id: '1',
            servicio_id: '3',
            cliente_nombre: 'Miguel Ángel Torres',
            cliente_telefono: '+52 555 456 7890',
            timestamp_inicio: new Date(now.setHours(baseHour + 2, 0, 0, 0)).toISOString(),
            timestamp_fin: new Date(now.setHours(baseHour + 3, 0, 0, 0)).toISOString(),
            origen: 'walkin',
            estado: 'en_espera',
            notas: 'Cliente frecuente',
            recordatorio_24h_enviado: false,
            recordatorio_1h_enviado: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            servicio: {
                id: '3',
                sucursal_id: '1',
                nombre: 'Combo Completo',
                duracion_minutos: 60,
                precio: 350,
                activo: true,
                created_at: new Date().toISOString()
            }
        }
    ]
}
