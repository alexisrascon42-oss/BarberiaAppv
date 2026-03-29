import { ChatOpenAI } from '@langchain/openai'
import { createReactAgent } from '@langchain/langgraph/prebuilt'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'

import { buildSystemPrompt } from './prompts'
import { makeAllTools } from './tools'
import { MemoryService } from './memory.service'
import { MetricsService } from './metrics.service'

export interface AgentContext {
    sucursalId: string
    nombre: string
    agentName: string
    personality: string
    timezone: string
    customPrompt?: string | null
    // Multi Provider support
    aiProvider: 'openai' | 'anthropic' | 'groq'
    aiModel: string
    openaiKey: string
    anthropicKey?: string | null
    groqKey?: string | null
}

export class AgentService {
    public static async run(
        sessionId: string,
        input: string,
        senderPhone: string,
        ctx: AgentContext
    ): Promise<string> {
        
        // 1. Instanciar herramientas aisladas para esta sucursal
        const tools = makeAllTools(ctx.sucursalId, ctx.timezone)

        // 2. Construir Prompt del Sistema con la personalidad
        const systemPromptStr = buildSystemPrompt({
            nombre: ctx.nombre,
            agentName: ctx.agentName,
            personality: ctx.personality,
            timezone: ctx.timezone,
            customPrompt: ctx.customPrompt || undefined
        })

        // 3. Crear LLM dinámico según el proveedor configurado
        let llm: any

        if (ctx.aiProvider === 'anthropic' && ctx.anthropicKey) {
            const { ChatAnthropic } = await import('@langchain/anthropic')
            llm = new ChatAnthropic({
                anthropicApiKey: ctx.anthropicKey,
                modelName: ctx.aiModel,
                temperature: 0
            })
        } else if (ctx.aiProvider === 'groq' && ctx.groqKey) {
            const { ChatGroq } = await import('@langchain/groq')
            llm = new ChatGroq({
                apiKey: ctx.groqKey,
                model: ctx.aiModel,
                temperature: 0
            })
        } else {
            llm = new ChatOpenAI({
                openAIApiKey: ctx.openaiKey,
                modelName: ctx.aiModel,
                temperature: 0
            })
        }

        // 4. Recuperar historial de chat previo
        const chatHistory = await MemoryService.getChatHistory(sessionId, ctx.timezone)
        const previousMessages = await chatHistory.getMessages()

        // 5. Armar el agente reactivo con LangGraph
        const agent = createReactAgent({
            llm,
            tools,
        })

        try {
            const startTimestamp = Date.now()
            const formatter = new Intl.DateTimeFormat('es-MX', { timeZone: ctx.timezone, year: 'numeric', month: '2-digit', day: '2-digit' })
            const timeFormatter = new Intl.DateTimeFormat('es-MX', { timeZone: ctx.timezone, hour: '2-digit', minute: '2-digit', hour12: false })

            const currentDate = formatter.format(new Date())
            const currentTime = timeFormatter.format(new Date())

            // Inyectar las variables de runtime al system prompt
            const finalSystemPrompt = systemPromptStr
                .replace('{current_date}', currentDate)
                .replace('{current_time}', currentTime)
                .replace('{sender_phone}', senderPhone)

            // 6. Ejecutar el grafo con el historial previo
            const result = await agent.invoke({
                messages: [
                    new SystemMessage(finalSystemPrompt),
                    ...previousMessages,
                    new HumanMessage(input),
                ],
            })

            // 7. Extraer la última respuesta del agente
            const lastMessage = result.messages[result.messages.length - 1]
            const raw = lastMessage.content
            const outputText: string = (Array.isArray(raw)
                ? raw.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('')
                : String(raw)).trim()

            // 8. Guardar el intercambio en el historial de Postgres
            await chatHistory.addUserMessage(input)
            await chatHistory.addAIMessage(outputText)

            // 9. Registrar métricas de latencia y herramientas usadas
            const latencyMs = Date.now() - startTimestamp
            const toolMessages = result.messages.filter((m: any) => m._getType?.() === 'tool')

            MetricsService.record({
                id: crypto.randomUUID(),
                timestamp: startTimestamp,
                sucursalId: ctx.sucursalId,
                sessionId,
                phone: senderPhone,
                inputPreview: input.substring(0, 1000),
                outputPreview: outputText.substring(0, 1000),
                latencyMs,
                toolsUsed: toolMessages.map((m: any) => ({
                    name: m.name ?? 'unknown',
                    input: {},
                    output: String(m.content ?? '').substring(0, 500)
                })),
                source: 'webhook'
            })

            return outputText

        } catch (error: any) {
            console.error('[AgentService] Error:', error)
            throw new Error(`AI Agent Error: ${error.message}`)
        }
    }
}
