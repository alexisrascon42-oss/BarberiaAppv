'use client'

import { useMemo } from 'react'
import type { CitaConRelaciones } from '@/lib/types'

interface AgendaTimelineProps {
    citas: CitaConRelaciones[]
    currentTime: Date
}

// Generate time slots from 8:00 to 20:00 (8am to 8pm)
const HORA_INICIO = 8
const HORA_FIN = 20
const INTERVALO_MINUTOS = 30

function generarSlots(): string[] {
    const slots: string[] = []
    for (let hora = HORA_INICIO; hora < HORA_FIN; hora++) {
        for (let minuto = 0; minuto < 60; minuto += INTERVALO_MINUTOS) {
            slots.push(`${hora.toString().padStart(2, '0')}:${minuto.toString().padStart(2, '0')}`)
        }
    }
    return slots
}

export function AgendaTimeline({ citas, currentTime }: AgendaTimelineProps) {
    const slots = useMemo(() => generarSlots(), [])

    // Calculate current time position (percentage from top)
    const currentHour = currentTime.getHours()
    const currentMinute = currentTime.getMinutes()
    const totalMinutesRange = (HORA_FIN - HORA_INICIO) * 60
    const currentMinutesFromStart = (currentHour - HORA_INICIO) * 60 + currentMinute
    const currentTimePosition = Math.max(0, Math.min(100, (currentMinutesFromStart / totalMinutesRange) * 100))

    // Check if a slot has an appointment
    const getCitaEnSlot = (slot: string) => {
        const [slotHora, slotMinuto] = slot.split(':').map(Number)
        const slotTime = new Date()
        slotTime.setHours(slotHora, slotMinuto, 0, 0)

        return citas.find(cita => {
            if (['cancelada', 'no_show', 'finalizada'].includes(cita.estado)) return false

            const citaInicio = new Date(cita.timestamp_inicio)
            const citaFin = new Date(cita.timestamp_fin)

            return slotTime >= citaInicio && slotTime < citaFin
        })
    }

    const getStatusColor = (estado: string) => {
        switch (estado) {
            case 'confirmada': return 'bg-blue-500'
            case 'en_espera': return 'bg-amber-500'
            case 'en_proceso': return 'bg-emerald-500'
            default: return 'bg-slate-500'
        }
    }

    // Check if current time is within working hours
    const dentroHorario = currentHour >= HORA_INICIO && currentHour < HORA_FIN

    return (
        <div className="relative h-[600px] overflow-y-auto">
            {/* Current time indicator */}
            {dentroHorario && (
                <div
                    className="current-time-line"
                    style={{ top: `${currentTimePosition}%` }}
                >
                    {/* Time label */}
                    <span className="absolute -left-1 -top-2.5 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded font-medium">
                        {currentTime.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
            )}

            {/* Time slots */}
            <div className="space-y-0">
                {slots.map((slot, index) => {
                    const cita = getCitaEnSlot(slot)
                    const isHour = slot.endsWith(':00')
                    const [slotHora, slotMinuto] = slot.split(':').map(Number)
                    const slotTime = new Date()
                    slotTime.setHours(slotHora, slotMinuto, 0, 0)
                    const isPast = slotTime < currentTime

                    return (
                        <div
                            key={slot}
                            className={`
                relative flex items-center gap-3 py-2 px-2 rounded-lg transition-colors duration-200
                ${isPast ? 'opacity-50' : ''}
                ${isHour ? 'border-t border-slate-700/50' : ''}
                ${cita ? 'bg-slate-800/50' : 'hover:bg-slate-800/30'}
              `}
                        >
                            {/* Time label */}
                            <div className={`
                w-12 text-xs font-mono shrink-0
                ${isHour ? 'text-slate-300 font-medium' : 'text-slate-500'}
              `}>
                                {slot}
                            </div>

                            {/* Slot indicator */}
                            <div className="relative flex-1">
                                {cita ? (
                                    <div className="flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full ${getStatusColor(cita.estado)} shrink-0`} />
                                        <span className="text-sm text-white truncate">
                                            {cita.cliente_nombre}
                                        </span>
                                        <span className="text-xs text-slate-500">
                                            {cita.servicio?.nombre}
                                        </span>
                                    </div>
                                ) : (
                                    <div className="h-5 border-l-2 border-slate-700" />
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Legend */}
            <div className="sticky bottom-0 bg-slate-900/95 backdrop-blur-sm border-t border-slate-700 mt-4 pt-3 pb-2 px-2">
                <div className="flex flex-wrap gap-3 text-xs">
                    <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        <span className="text-slate-400">Confirmada</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        <span className="text-slate-400">Espera</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-slate-400">En Proceso</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
