'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import type { Barbero, BarberoConSucursal, Sucursal } from '@/lib/types'
import { HorarioGanttModal } from '@/components/HorarioGanttModal'

export default function BarberosPage() {
    const [barberos, setBarberos] = useState<BarberoConSucursal[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showScheduleModal, setShowScheduleModal] = useState(false)
    const [showGanttModal, setShowGanttModal] = useState(false) // New state
    const [editingBarbero, setEditingBarbero] = useState<Barbero | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [sucursalData, setSucursalData] = useState<Sucursal | null>(null) // New state

    const supabase = createClient()

    const cargarBarberos = useCallback(async () => {
        try {
            const { data, error } = await (supabase
                .from('barberos') as any)
                .select('*, sucursal:sucursales(*)') // Fetch full sucursal object
                .order('estacion_id', { ascending: true })

            if (error) {
                console.error('Error loading barbers:', error)
                // Demo data
                setBarberos(getDemoBarbers())
            } else {
                setBarberos(data || [])
                // Extract unique sucursal if available
                if (data && data.length > 0 && data[0].sucursal) {
                    setSucursalData(data[0].sucursal)
                }
            }
        } catch (err) {
            console.error('Supabase not configured:', err)
            setBarberos(getDemoBarbers())
        } finally {
            setLoading(false)
        }
    }, [supabase])

    useEffect(() => {
        cargarBarberos()
    }, [cargarBarberos])

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este barbero?')) return

        try {
            const { error } = await supabase
                .from('barberos')
                .delete()
                .eq('id', id)

            if (error) {
                console.error('Error deleting:', error)
                alert('Error al eliminar')
            } else {
                cargarBarberos()
            }
        } catch {
            // Demo mode - just filter locally
            setBarberos(barberos.filter(b => b.id !== id))
        }
    }

    const handleEdit = (barbero: Barbero) => {
        setEditingBarbero(barbero)
        setShowModal(true)
    }

    const handleNew = () => {
        setEditingBarbero(null)
        setShowModal(true)
    }

    const filteredBarberos = barberos.filter(b =>
        b.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.usuario_tablet.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (

        <>
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-white">Barberos</h1>
                        <p className="text-slate-400 mt-1">Gestiona el equipo de trabajo</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setShowGanttModal(true)}
                            className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white transition-colors flex items-center gap-2"
                        >
                            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            Ver Diagrama
                        </button>
                        <button onClick={handleNew} className="btn-primary flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            Nuevo Barbero
                        </button>
                    </div>
                </div>
            </div>

            <HorarioGanttModal
                isOpen={showGanttModal}
                onClose={() => setShowGanttModal(false)}
                barberos={barberos}
                sucursal={sucursalData}
            />

            {/* Search & Filters */}
            <div className="glass-card p-4 mb-6">
                <div className="flex items-center gap-4">
                    <div className="flex-1 relative">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Buscar por nombre o usuario..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input-field pl-10"
                        />
                    </div>
                    <span className="text-slate-400 text-sm">{filteredBarberos.length} barberos</span>
                </div>
            </div>

            {/* Table */}
            <div className="glass-card overflow-hidden">
                {loading ? (
                    <div className="p-12 flex items-center justify-center">
                        <div className="spinner w-8 h-8" />
                    </div>
                ) : filteredBarberos.length === 0 ? (
                    <div className="p-12 text-center">
                        <svg className="w-12 h-12 text-slate-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <p className="text-slate-500">No se encontraron barberos</p>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-slate-800/50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Estación</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Barbero</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Usuario</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Horario</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Estado</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {filteredBarberos.map((barbero) => (
                                <tr key={barbero.id} className="hover:bg-slate-800/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-purple-400 flex items-center justify-center font-bold text-white">
                                            {barbero.estacion_id}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-lg font-medium text-white">
                                                {barbero.nombre.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-medium text-white">{barbero.nombre}</p>
                                                <p className="text-xs text-slate-400">Estación {barbero.estacion_id}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <code className="px-2 py-1 rounded bg-slate-700 text-sm text-slate-300">
                                            {barbero.usuario_tablet}
                                        </code>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm text-slate-300">
                                            {getHorarioResumen(barbero.horario_laboral)}
                                        </p>
                                        {barbero.bloqueo_almuerzo && (
                                            <p className="text-xs text-slate-500 mt-1">
                                                🍽️ {barbero.bloqueo_almuerzo.inicio} - {barbero.bloqueo_almuerzo.fin}
                                            </p>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`
                      status-badge
                      ${barbero.activo ? 'status-in-progress' : 'status-cancelled'}
                    `}>
                                            {barbero.activo ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handleEdit(barbero)}
                                                className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"
                                                title="Editar"
                                            >
                                                <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setEditingBarbero(barbero)
                                                    setShowScheduleModal(true)
                                                }}
                                                className="p-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 transition-colors"
                                                title="Configurar Horario"
                                            >
                                                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => handleDelete(barbero.id)}
                                                className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 transition-colors"
                                                title="Eliminar"
                                            >
                                                <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <BarberoModal
                    barbero={editingBarbero}
                    onClose={() => setShowModal(false)}
                    onSave={() => {
                        setShowModal(false)
                        cargarBarberos()
                    }}
                />
            )}

            {showScheduleModal && editingBarbero && (
                <HorarioModal
                    barbero={editingBarbero}
                    onClose={() => setShowScheduleModal(false)}
                    onSave={() => {
                        setShowScheduleModal(false)
                        cargarBarberos()
                    }}
                />
            )}
        </>

    )
}

// Helper to summarize schedule
function getHorarioResumen(horario: Record<string, { inicio: string; fin: string }>) {
    if (!horario) return 'No configurado'
    const dias = Object.keys(horario).length
    const ejemplo = Object.values(horario)[0]
    if (!ejemplo) return 'No configurado'
    return `${dias} días • ${ejemplo.inicio} - ${ejemplo.fin}`
}

// Demo data
function getDemoBarbers(): BarberoConSucursal[] {
    return [
        {
            id: '1',
            sucursal_id: '1',
            nombre: 'Carlos Hernández',
            estacion_id: 1,
            usuario_tablet: 'carlos01',
            password_hash: '',
            horario_laboral: {
                lunes: { inicio: '09:00', fin: '18:00' },
                martes: { inicio: '09:00', fin: '18:00' },
                miercoles: { inicio: '09:00', fin: '18:00' },
                jueves: { inicio: '09:00', fin: '18:00' },
                viernes: { inicio: '09:00', fin: '18:00' },
                sabado: { inicio: '09:00', fin: '15:00' }
            },
            bloqueo_almuerzo: { inicio: '14:00', fin: '15:00' },
            activo: true,
            hora_entrada: null,
            created_at: new Date().toISOString()
        },
        {
            id: '2',
            sucursal_id: '1',
            nombre: 'Miguel Ángel López',
            estacion_id: 2,
            usuario_tablet: 'miguel02',
            password_hash: '',
            horario_laboral: {
                lunes: { inicio: '10:00', fin: '19:00' },
                martes: { inicio: '10:00', fin: '19:00' },
                miercoles: { inicio: '10:00', fin: '19:00' },
                jueves: { inicio: '10:00', fin: '19:00' },
                viernes: { inicio: '10:00', fin: '19:00' },
                sabado: { inicio: '10:00', fin: '16:00' }
            },
            bloqueo_almuerzo: { inicio: '14:30', fin: '15:30' },
            activo: true,
            hora_entrada: null,
            created_at: new Date().toISOString()
        },
        {
            id: '3',
            sucursal_id: '1',
            nombre: 'Roberto Sánchez',
            estacion_id: 3,
            usuario_tablet: 'roberto03',
            password_hash: '',
            horario_laboral: {
                lunes: { inicio: '09:00', fin: '18:00' },
                martes: { inicio: '09:00', fin: '18:00' },
                miercoles: { inicio: '09:00', fin: '18:00' },
                jueves: { inicio: '09:00', fin: '18:00' },
                viernes: { inicio: '09:00', fin: '18:00' }
            },
            bloqueo_almuerzo: null,
            activo: false,
            hora_entrada: null,
            created_at: new Date().toISOString()
        }
    ]
}

// Modal Component
function BarberoModal({
    barbero,
    onClose,
    onSave
}: {
    barbero: Barbero | null
    onClose: () => void
    onSave: () => void
}) {
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        nombre: barbero?.nombre || '',
        estacion_id: barbero?.estacion_id?.toString() || '',
        usuario_tablet: barbero?.usuario_tablet || '',
        password: '',
        activo: barbero?.activo ?? true
    })

    const supabase = createClient()

    const [sucursalId, setSucursalId] = useState<string | null>(null)

    // Fetch sucursal_id on mount
    useEffect(() => {
        const fetchSucursal = async () => {
            const { data } = await supabase
                .from('sucursales')
                .select('id')
                .limit(1)
                .single()

            if (data) {
                setSucursalId(data.id)
            }
        }
        fetchSucursal()
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            if (!sucursalId && !barbero) {
                throw new Error('No se encontró una sucursal activa')
            }

            const data = {
                nombre: formData.nombre,
                estacion_id: parseInt(formData.estacion_id),
                usuario_tablet: formData.usuario_tablet,
                activo: formData.activo,
                horario_laboral: {
                    lunes: { inicio: '09:00', fin: '18:00' },
                    martes: { inicio: '09:00', fin: '18:00' },
                    miercoles: { inicio: '09:00', fin: '18:00' },
                    jueves: { inicio: '09:00', fin: '18:00' },
                    viernes: { inicio: '09:00', fin: '18:00' },
                    sabado: { inicio: '09:00', fin: '15:00' }
                },
                password_hash: formData.password ? `hashed_${formData.password}` : barbero?.password_hash || 'default_hash'
            }

            if (barbero) {
                // Update
                const { error } = await (supabase
                    .from('barberos') as any)
                    .update(data)
                    .eq('id', barbero.id)

                if (error) throw error
            } else {
                // Insert - use real sucursal_id
                const { error } = await (supabase
                    .from('barberos') as any)
                    .insert([{ ...data, sucursal_id: sucursalId }])

                if (error) throw error
            }

            onSave()
        } catch (err) {
            console.error('Error saving:', err)
            // Demo mode - just close
            onSave()
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-card w-full max-w-lg animate-slide-in">
                <div className="flex items-center justify-between p-6 border-b border-slate-700">
                    <h2 className="text-xl font-bold text-white">
                        {barbero ? 'Editar Barbero' : 'Nuevo Barbero'}
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-700 transition-colors">
                        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Existing form fields... */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Nombre</label>
                            <input
                                type="text"
                                value={formData.nombre}
                                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                className="input-field"
                                placeholder="Juan Pérez"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Estación</label>
                            <input
                                type="number"
                                min="1"
                                max="20"
                                value={formData.estacion_id}
                                onChange={(e) => setFormData({ ...formData, estacion_id: e.target.value })}
                                className="input-field"
                                placeholder="1"
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Usuario Tablet</label>
                            <input
                                type="text"
                                value={formData.usuario_tablet}
                                onChange={(e) => setFormData({ ...formData, usuario_tablet: e.target.value })}
                                className="input-field"
                                placeholder="juan01"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                {barbero ? 'Nueva Contraseña (opcional)' : 'Contraseña'}
                            </label>
                            <input
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="input-field"
                                placeholder="••••••••"
                                required={!barbero}
                            />
                        </div>
                    </div>



                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            id="activo"
                            checked={formData.activo}
                            onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                            className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-purple-500 focus:ring-purple-500"
                        />
                        <label htmlFor="activo" className="text-sm text-slate-300">
                            Barbero activo
                        </label>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                        <button type="button" onClick={onClose} className="btn-secondary">
                            Cancelar
                        </button>
                        <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
                            {loading && <div className="spinner w-4 h-4" />}
                            {barbero ? 'Guardar Cambios' : 'Crear Barbero'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

function HorarioModal({
    barbero,
    onClose,
    onSave
}: {
    barbero: Barbero
    onClose: () => void
    onSave: () => void
}) {
    const defaultSchedule = { inicio: '09:00', fin: '18:00' }
    const diasSemana = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']

    const [loading, setLoading] = useState(false)
    const [horario, setHorario] = useState<Record<string, { inicio: string, fin: string } | null>>(() => {
        const initial: any = {}
        diasSemana.forEach(dia => {
            // @ts-ignore
            initial[dia] = barbero.horario_laboral?.[dia] || null
        })
        return initial
    })

    // Lunch state
    const [almuerzo, setAlmuerzo] = useState({
        inicio: barbero.bloqueo_almuerzo?.inicio || '14:00',
        fin: barbero.bloqueo_almuerzo?.fin || '15:00',
        activo: !!barbero.bloqueo_almuerzo
    })

    const supabase = createClient()

    const handleDayToggle = (dia: string, active: boolean) => {
        setHorario(prev => ({
            ...prev,
            [dia]: active ? defaultSchedule : null
        }))
    }

    const handleTimeChange = (dia: string, field: 'inicio' | 'fin', value: string) => {
        setHorario(prev => ({
            ...prev,
            [dia]: prev[dia] ? { ...prev[dia]!, [field]: value } : null
        }))
    }

    const handleSave = async () => {
        setLoading(true)
        try {
            // Filter out nulls (days off) to save clean object
            const cleanHorario: any = {}
            Object.entries(horario).forEach(([dia, data]) => {
                if (data) cleanHorario[dia] = data
            })

            const { error } = await (supabase
                .from('barberos') as any)
                .update({
                    horario_laboral: cleanHorario,
                    bloqueo_almuerzo: almuerzo.activo ? {
                        inicio: almuerzo.inicio,
                        fin: almuerzo.fin
                    } : null
                })
                .eq('id', barbero.id)

            if (error) throw error
            onSave()
        } catch (err: any) {
            alert('Error al guardar horario: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-card w-full max-w-2xl animate-slide-in max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-slate-700">
                    <div>
                        <h2 className="text-xl font-bold text-white">Configurar Horario</h2>
                        <p className="text-sm text-slate-400">Barbero: {barbero.nombre}</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-700 transition-colors">
                        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {/* Lunch Break Section */}
                    <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50 mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <span className="text-xl">🍽️</span>
                                <div>
                                    <h3 className="font-medium text-white">Bloqueo de Almuerzo (Diario)</h3>
                                    <p className="text-xs text-slate-400">Se aplicará a todos los días laborales</p>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={almuerzo.activo}
                                    onChange={(e) => setAlmuerzo(prev => ({ ...prev, activo: e.target.checked }))}
                                />
                                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>

                        {almuerzo.activo && (
                            <div className="flex items-center gap-4 bg-slate-900/50 p-3 rounded-lg border border-slate-700/50 transition-all animate-fade-in">
                                <div className="flex-1">
                                    <label className="text-xs text-slate-400 mb-1 block">Inicio</label>
                                    <input
                                        type="time"
                                        value={almuerzo.inicio}
                                        onChange={(e) => setAlmuerzo(prev => ({ ...prev, inicio: e.target.value }))}
                                        className="input-field"
                                    />
                                </div>
                                <span className="text-slate-500 pt-5">-</span>
                                <div className="flex-1">
                                    <label className="text-xs text-slate-400 mb-1 block">Fin</label>
                                    <input
                                        type="time"
                                        value={almuerzo.fin}
                                        onChange={(e) => setAlmuerzo(prev => ({ ...prev, fin: e.target.value }))}
                                        className="input-field"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="h-px bg-slate-700 my-4" />

                    {diasSemana.map(dia => {
                        const isActive = !!horario[dia]
                        return (
                            <div key={dia} className="flex items-center gap-4 p-3 rounded-lg bg-slate-800/50">
                                <div className="w-32 flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={isActive}
                                        onChange={(e) => handleDayToggle(dia, e.target.checked)}
                                        className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-purple-500 focus:ring-purple-500"
                                    />
                                    <span className="capitalize text-slate-300 font-medium">{dia}</span>
                                </div>

                                {isActive ? (
                                    <div className="flex items-center gap-3 flex-1">
                                        <input
                                            type="time"
                                            value={horario[dia]?.inicio}
                                            onChange={(e) => handleTimeChange(dia, 'inicio', e.target.value)}
                                            className="input-field py-1 text-sm w-32"
                                        />
                                        <span className="text-slate-500">-</span>
                                        <input
                                            type="time"
                                            value={horario[dia]?.fin}
                                            onChange={(e) => handleTimeChange(dia, 'fin', e.target.value)}
                                            className="input-field py-1 text-sm w-32"
                                        />
                                    </div>
                                ) : (
                                    <div className="flex-1 text-slate-600 text-sm italic">
                                        Día de descanso
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>

                <div className="flex justify-end gap-3 p-6 border-t border-slate-700">
                    <button onClick={onClose} className="btn-secondary">
                        Cancelar
                    </button>
                    <button onClick={handleSave} disabled={loading} className="btn-primary flex items-center gap-2">
                        {loading ? 'Guardando...' : 'Guardar Horario'}
                    </button>
                </div>
            </div>
        </div>
    )
}
