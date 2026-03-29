import { makeConsultarServiciosTool, makeConsultarBarberosTool, makeConsultarSucursalTool } from './business.tools'
import { makeDisponibilidadHoyTool, makeDisponibilidadOtroDiaTool, makeValidarHoraTool } from './availability.tools'
import { makeBuscarOCrearClienteTool, makeMisCitasTool, makeAgendarCitaTool, makeCancelarCitaTool } from './appointment.tools'

/**
 * Builds the full set of LangChain tools scoped to a single tenant (sucursal).
 * All queries point to the external operational BD (evolutiondb) via agentPool.
 *
 * @param sucursalId  UUID del negocio — todas las queries se filtran por este valor.
 * @param timezone    Zona horaria del negocio (default: America/Hermosillo UTC-7)
 */
export function makeAllTools(sucursalId: string, timezone: string = 'America/Hermosillo') {
    return [
        // Información del negocio
        makeConsultarServiciosTool(sucursalId),
        makeConsultarBarberosTool(sucursalId),
        makeConsultarSucursalTool(sucursalId),

        // Validación y disponibilidad
        makeValidarHoraTool(timezone),
        makeDisponibilidadHoyTool(sucursalId, timezone),
        makeDisponibilidadOtroDiaTool(sucursalId, timezone),

        // Gestión de citas y CRM
        makeBuscarOCrearClienteTool(sucursalId),
        makeMisCitasTool(sucursalId),
        makeAgendarCitaTool(sucursalId),
        makeCancelarCitaTool(sucursalId),
    ]
}

export * from './business.tools'
export * from './availability.tools'
export * from './appointment.tools'
