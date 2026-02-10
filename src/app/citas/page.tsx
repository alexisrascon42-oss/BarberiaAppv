'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import type { Servicio, Barbero, HorarioApertura, HorarioLaboralSemana } from '@/lib/types'

export default function BookingPage() {
    // State for Wizard Steps
    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)

    // Data State
    const [servicios, setServicios] = useState<Servicio[]>([])
    const [barberos, setBarberos] = useState<Barbero[]>([])

    // Selection State
    const [selectedService, setSelectedService] = useState<Servicio | null>(null)
    const [selectedBarber, setSelectedBarber] = useState<Barbero | null>(null)
    const [selectedDate, setSelectedDate] = useState<string>('')
    const [selectedTime, setSelectedTime] = useState<string>('')
    const [clientName, setClientName] = useState('')
    const [clientPhone, setClientPhone] = useState('')
    const [clientNote, setClientNote] = useState('')

    const supabase = createClient()
    const SUCURSAL_ID = '1' // Todo: dynamic

    useEffect(() => {
        loadInitialData()
    }, [])

    const loadInitialData = async () => {
        setLoading(true)
        try {
            // Load Services
            const { data: servicesData } = await supabase
                .from('servicios')
                .select('*')
                .eq('activo', true)
                .order('precio')

            if (servicesData) setServicios(servicesData)
            else setServicios(getDemoServices())

            // Load Barbers
            const { data: barbersData } = await supabase
                .from('barberos')
                .select('*')
                .eq('activo', true)

            if (barbersData) setBarberos(barbersData)
            else setBarberos(getDemoBarbers())

        } catch (err) {
            console.error('Error loading data:', err)
            setServicios(getDemoServices())
            setBarberos(getDemoBarbers())
        } finally {
            setLoading(false)
        }
    }

    const handleServiceSelect = (service: Servicio) => {
        setSelectedService(service)
        setStep(2)
    }

    const handleBarberSelect = (barber: Barbero | null) => {
        setSelectedBarber(barber)
        setStep(3)
    }

    const handleTimeSelect = (date: string, time: string) => {
        setSelectedDate(date)
        setSelectedTime(time)
        setStep(4)
    }

    const handleSubmit = async () => {
        setLoading(true)
        try {
            const appointmentData = {
                sucursal_id: SUCURSAL_ID,
                barbero_id: selectedBarber?.id || barberos[0].id, // Logic to assign random if null
                servicio_id: selectedService?.id,
                cliente_nombre: clientName,
                cliente_telefono: clientPhone,
                timestamp_inicio: `${selectedDate}T${selectedTime}:00`,
                timestamp_fin: calculateEndTime(`${selectedDate}T${selectedTime}:00`, selectedService?.duracion_minutos || 30),
                origen: 'walkin', // or web
                estado: 'confirmada',
                notas: clientNote
            }

            const { error } = await supabase.from('citas').insert([appointmentData] as any)

            if (error) throw error

            alert('¡Cita Confirmada!')
            // Reset or redirect
            window.location.href = '/'

        } catch (err) {
            console.error('Error creating appointment:', err)
            alert('Error al agendar la cita. Intente nuevamente.')
        } finally {
            setLoading(false)
        }
    }

    // Helper to calculate end time
    const calculateEndTime = (startIso: string, durationMinutes: number) => {
        const date = new Date(startIso)
        date.setMinutes(date.getMinutes() + durationMinutes)
        return date.toISOString() // Note: DB expects ISO or timestamp
    }

    // Generate available time slots (Simplified logic for demo)
    const generateTimeSlots = (dateStr: string) => {
        // In real app, check availability vs existing appointments
        const slots = []
        for (let h = 9; h < 20; h++) {
            slots.push(`${h.toString().padStart(2, '0')}:00`)
            slots.push(`${h.toString().padStart(2, '0')}:30`)
        }
        return slots
    }

    return (
        <div className="min-h-screen bg-slate-900 text-white p-4 md:p-8">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent mb-2">
                        BarberCloud
                    </h1>
                    <p className="text-slate-400">Reserva tu próxima experiencia</p>
                </div>

                {/* Progress Bar */}
                <div className="flex items-center justify-between mb-8 relative">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-800 -z-10 rounded"></div>
                    {[1, 2, 3, 4].map((s) => (
                        <div
                            key={s}
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300
                            ${step >= s ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/50' : 'bg-slate-800 text-slate-500 border border-slate-700'}
                            `}
                        >
                            {s}
                        </div>
                    ))}
                </div>

                {/* Step 1: Select Service */}
                {step === 1 && (
                    <div className="animate-fade-in space-y-4">
                        <h2 className="text-xl font-bold mb-4">Elige un Servicio</h2>
                        {loading ? (
                            <div className="p-10 flex justify-center"><div className="spinner"></div></div>
                        ) : (
                            <div className="grid gap-4">
                                {servicios.map(servicio => (
                                    <div
                                        key={servicio.id}
                                        onClick={() => handleServiceSelect(servicio)}
                                        className="glass-card p-4 hover:border-purple-500/50 cursor-pointer transition-all hover:scale-[1.02] flex justify-between items-center group"
                                    >
                                        <div>
                                            <h3 className="font-bold text-lg group-hover:text-purple-400 transition-colors">{servicio.nombre}</h3>
                                            <p className="text-sm text-slate-400">{servicio.duracion_minutos} min</p>
                                        </div>
                                        <div className="text-xl font-bold text-white">
                                            ${servicio.precio}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Step 2: Select Barber (Optional logic, passing null means 'Any') */}
                {step === 2 && (
                    <div className="animate-fade-in space-y-4">
                        <h2 className="text-xl font-bold mb-4">Elige tu Profesional</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div
                                onClick={() => handleBarberSelect(null)}
                                className="glass-card p-6 text-center hover:border-purple-500/50 cursor-pointer transition-all hover:scale-[1.02]"
                            >
                                <div className="w-16 h-16 rounded-full bg-slate-700 mx-auto mb-3 flex items-center justify-center text-2xl">🎲</div>
                                <h3 className="font-bold">Cualquiera</h3>
                                <p className="text-xs text-slate-400 mt-1">El primero disponible</p>
                            </div>
                            {barberos.map(barbero => (
                                <div
                                    key={barbero.id}
                                    onClick={() => handleBarberSelect(barbero)}
                                    className="glass-card p-6 text-center hover:border-purple-500/50 cursor-pointer transition-all hover:scale-[1.02]"
                                >
                                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 mx-auto mb-3 flex items-center justify-center text-xl font-bold text-white">
                                        {barbero.nombre[0]}
                                    </div>
                                    <h3 className="font-bold text-sm">{barbero.nombre}</h3>
                                </div>
                            ))}
                        </div>
                        <button onClick={() => setStep(1)} className="text-slate-400 text-sm mt-4 hover:text-white">← Volver</button>
                    </div>
                )}

                {/* Step 3: Select Date & Time */}
                {step === 3 && (
                    <div className="animate-fade-in space-y-4">
                        <h2 className="text-xl font-bold mb-4">Fecha y Hora</h2>

                        <div className="glass-card p-4 mb-4">
                            <label className="block text-sm text-slate-400 mb-2">Fecha</label>
                            <input
                                type="date"
                                className="input-field"
                                min={new Date().toISOString().split('T')[0]}
                                onChange={(e) => setSelectedDate(e.target.value)}
                            />
                        </div>

                        {selectedDate && (
                            <div className="grid grid-cols-3 gap-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                {generateTimeSlots(selectedDate).map(time => (
                                    <button
                                        key={time}
                                        onClick={() => handleTimeSelect(selectedDate, time)}
                                        className="py-2 rounded-lg bg-slate-800 hover:bg-purple-600 hover:text-white text-slate-300 transition-colors text-sm font-medium border border-slate-700"
                                    >
                                        {time}
                                    </button>
                                ))}
                            </div>
                        )}

                        <button onClick={() => setStep(2)} className="text-slate-400 text-sm mt-4 hover:text-white">← Volver</button>
                    </div>
                )}

                {/* Step 4: Confirmation & Details */}
                {step === 4 && (
                    <div className="animate-fade-in space-y-6">
                        <h2 className="text-xl font-bold mb-4">Completa tu Reserva</h2>

                        <div className="glass-card p-4 space-y-4">
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Nombre Completo</label>
                                <input
                                    type="text"
                                    value={clientName}
                                    onChange={e => setClientName(e.target.value)}
                                    className="input-field"
                                    placeholder="Ej. Juan Pérez"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Teléfono</label>
                                <input
                                    type="tel"
                                    value={clientPhone}
                                    onChange={e => setClientPhone(e.target.value)}
                                    className="input-field"
                                    placeholder="Ej. 55 1234 5678"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Notas (Opcional)</label>
                                <textarea
                                    value={clientNote}
                                    onChange={e => setClientNote(e.target.value)}
                                    className="input-field min-h-[80px]"
                                    placeholder="Alergias, preferencias..."
                                />
                            </div>
                        </div>

                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                            <h3 className="font-bold text-white mb-2">Resumen</h3>
                            <div className="text-sm space-y-1 text-slate-400">
                                <p>🗓️ {selectedDate} a las {selectedTime}</p>
                                <p>✂️ {selectedService?.nombre} (${selectedService?.precio})</p>
                                <p>💈 {selectedBarber ? selectedBarber.nombre : 'Cualquier profesional'}</p>
                            </div>
                        </div>

                        <button
                            onClick={handleSubmit}
                            disabled={loading || !clientName || !clientPhone}
                            className="w-full btn-primary py-4 text-lg shadow-xl shadow-purple-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Confirmando...' : 'Confirmar Cita'}
                        </button>

                        <div className="text-center">
                            <button onClick={() => setStep(3)} className="text-slate-400 text-sm hover:text-white">← Volver</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

function getDemoServices(): Servicio[] {
    return [
        { id: '1', sucursal_id: '1', nombre: 'Corte Clásico', duracion_minutos: 40, precio: 250, activo: true, created_at: '' },
        { id: '2', sucursal_id: '1', nombre: 'Barba', duracion_minutos: 30, precio: 150, activo: true, created_at: '' },
        { id: '3', sucursal_id: '1', nombre: 'Combo Completo', duracion_minutos: 60, precio: 350, activo: true, created_at: '' },
    ]
}

function getDemoBarbers(): Barbero[] {
    return [
        { id: '1', sucursal_id: '1', nombre: 'Carlos H.', estacion_id: 1, usuario_tablet: '', password_hash: '', horario_laboral: {}, bloqueo_almuerzo: null, activo: true, hora_entrada: null, created_at: '' },
        { id: '2', sucursal_id: '1', nombre: 'Miguel L.', estacion_id: 2, usuario_tablet: '', password_hash: '', horario_laboral: {}, bloqueo_almuerzo: null, activo: true, hora_entrada: null, created_at: '' },
    ]
}
