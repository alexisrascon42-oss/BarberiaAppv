'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import type { Servicio } from '@/lib/types'

export default function ServiciosPage() {
    const [servicios, setServicios] = useState<Servicio[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editingServicio, setEditingServicio] = useState<Servicio | null>(null)

    const supabase = createClient()

    const cargarServicios = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('servicios')
                .select('*')
                .order('precio', { ascending: true })

            if (error) {
                console.error('Error loading services:', error)
                setServicios(getDemoServices())
            } else {
                setServicios(data || [])
            }
        } catch (err) {
            console.error('Supabase not configured:', err)
            setServicios(getDemoServices())
        } finally {
            setLoading(false)
        }
    }, [supabase])

    useEffect(() => {
        cargarServicios()
    }, [cargarServicios])

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este servicio?')) return

        try {
            const { error } = await supabase
                .from('servicios')
                .delete()
                .eq('id', id)

            if (error) {
                console.error('Error deleting:', error)
                alert('Error al eliminar')
            } else {
                cargarServicios()
            }
        } catch {
            setServicios(servicios.filter(s => s.id !== id))
        }
    }

    const handleEdit = (servicio: Servicio) => {
        setEditingServicio(servicio)
        setShowModal(true)
    }

    const handleNew = () => {
        setEditingServicio(null)
        setShowModal(true)
    }

    const toggleActivo = async (servicio: Servicio) => {
        try {
            const { error } = await supabase
                .from('servicios')
                .update({ activo: !servicio.activo })
                .eq('id', servicio.id)

            if (error) throw error
            cargarServicios()
        } catch (err) {
            console.error('Error toggling:', err)
            // Demo mode
            setServicios(servicios.map(s =>
                s.id === servicio.id ? { ...s, activo: !s.activo } : s
            ))
        }
    }

    return (

        <>
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-white">Servicios</h1>
                        <p className="text-slate-400 mt-1">Configura los servicios disponibles</p>
                    </div>
                    <button onClick={handleNew} className="btn-primary flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Nuevo Servicio
                    </button>
                </div>
            </div>

            {/* Services Grid */}
            {loading ? (
                <div className="glass-card p-12 flex items-center justify-center">
                    <div className="spinner w-8 h-8" />
                </div>
            ) : servicios.length === 0 ? (
                <div className="glass-card p-12 text-center">
                    <svg className="w-12 h-12 text-slate-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
                    </svg>
                    <p className="text-slate-500">No hay servicios configurados</p>
                    <button onClick={handleNew} className="btn-primary mt-4">
                        Crear primer servicio
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {servicios.map((servicio) => (
                        <div
                            key={servicio.id}
                            className={`
                glass-card p-6 transition-all duration-300 hover:scale-[1.02]
                ${!servicio.activo ? 'opacity-60' : ''}
              `}
                        >
                            {/* Header */}
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                                    <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
                                    </svg>
                                </div>
                                <button
                                    onClick={() => toggleActivo(servicio)}
                                    className={`
                    relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                    ${servicio.activo ? 'bg-purple-600' : 'bg-slate-600'}
                  `}
                                >
                                    <span className={`
                    inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                    ${servicio.activo ? 'translate-x-6' : 'translate-x-1'}
                  `} />
                                </button>
                            </div>

                            {/* Content */}
                            <h3 className="text-xl font-bold text-white mb-2">{servicio.nombre}</h3>

                            <div className="flex items-center gap-4 text-slate-400 text-sm mb-4">
                                <div className="flex items-center gap-1">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {servicio.duracion_minutos} min
                                </div>
                            </div>

                            {/* Price */}
                            <div className="flex items-baseline gap-1 mb-6">
                                <span className="text-3xl font-bold text-white">
                                    ${servicio.precio.toLocaleString('es-MX')}
                                </span>
                                <span className="text-slate-400">MXN</span>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleEdit(servicio)}
                                    className="flex-1 py-2 px-4 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors text-sm font-medium text-white flex items-center justify-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                    Editar
                                </button>
                                <button
                                    onClick={() => handleDelete(servicio.id)}
                                    className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 transition-colors"
                                    title="Eliminar"
                                >
                                    <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <ServicioModal
                    servicio={editingServicio}
                    onClose={() => setShowModal(false)}
                    onSave={() => {
                        setShowModal(false)
                        cargarServicios()
                    }}
                />
            )}
        </>

    )
}

// Demo data
function getDemoServices(): Servicio[] {
    return [
        {
            id: '1',
            sucursal_id: '1',
            nombre: 'Corte Clásico',
            duracion_minutos: 40,
            precio: 250,
            activo: true,
            created_at: new Date().toISOString()
        },
        {
            id: '2',
            sucursal_id: '1',
            nombre: 'Barba',
            duracion_minutos: 30,
            precio: 150,
            activo: true,
            created_at: new Date().toISOString()
        },
        {
            id: '3',
            sucursal_id: '1',
            nombre: 'Combo Completo',
            duracion_minutos: 60,
            precio: 350,
            activo: true,
            created_at: new Date().toISOString()
        },
        {
            id: '4',
            sucursal_id: '1',
            nombre: 'Corte + Diseño',
            duracion_minutos: 50,
            precio: 300,
            activo: true,
            created_at: new Date().toISOString()
        },
        {
            id: '5',
            sucursal_id: '1',
            nombre: 'Corte Infantil',
            duracion_minutos: 30,
            precio: 180,
            activo: false,
            created_at: new Date().toISOString()
        }
    ]
}

// Modal Component
function ServicioModal({
    servicio,
    onClose,
    onSave
}: {
    servicio: Servicio | null
    onClose: () => void
    onSave: () => void
}) {
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        nombre: servicio?.nombre || '',
        duracion_minutos: servicio?.duracion_minutos?.toString() || '30',
        precio: servicio?.precio?.toString() || '',
        activo: servicio?.activo ?? true
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
            if (!sucursalId && !servicio) {
                throw new Error('No se encontró una sucursal activa')
            }

            const data = {
                nombre: formData.nombre,
                duracion_minutos: parseInt(formData.duracion_minutos),
                precio: parseFloat(formData.precio),
                activo: formData.activo
            }

            if (servicio) {
                const { error } = await (supabase
                    .from('servicios') as any)
                    .update(data)
                    .eq('id', servicio.id)

                if (error) throw error
            } else {
                const { error } = await (supabase
                    .from('servicios') as any)
                    .insert([{ ...data, sucursal_id: sucursalId }])

                if (error) throw error
            }

            onSave()
        } catch (err) {
            console.error('Error saving:', err)
            onSave()
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-card w-full max-w-md animate-slide-in">
                <div className="flex items-center justify-between p-6 border-b border-slate-700">
                    <h2 className="text-xl font-bold text-white">
                        {servicio ? 'Editar Servicio' : 'Nuevo Servicio'}
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-700 transition-colors">
                        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Nombre del Servicio</label>
                        <input
                            type="text"
                            value={formData.nombre}
                            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                            className="input-field"
                            placeholder="Corte Clásico"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Duración (minutos)</label>
                            <select
                                value={formData.duracion_minutos}
                                onChange={(e) => setFormData({ ...formData, duracion_minutos: e.target.value })}
                                className="input-field"
                            >
                                <option value="15">15 min</option>
                                <option value="30">30 min</option>
                                <option value="40">40 min</option>
                                <option value="45">45 min</option>
                                <option value="60">60 min</option>
                                <option value="90">90 min</option>
                                <option value="120">120 min</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Precio (MXN)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={formData.precio}
                                    onChange={(e) => setFormData({ ...formData, precio: e.target.value })}
                                    className="input-field pl-8"
                                    placeholder="250.00"
                                    required
                                />
                            </div>
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
                            Servicio disponible
                        </label>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                        <button type="button" onClick={onClose} className="btn-secondary">
                            Cancelar
                        </button>
                        <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
                            {loading && <div className="spinner w-4 h-4" />}
                            {servicio ? 'Guardar Cambios' : 'Crear Servicio'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
