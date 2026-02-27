import OpenAI from 'openai'

interface OpenAIConfig {
    apiKey: string
    systemPrompt: string
}

interface Message {
    role: 'system' | 'user' | 'assistant'
    content: string
}

interface ExtractedIntent {
    nombre?: string
    fecha?: string // YYYY-MM-DD
    hora?: string // HH:MM
    servicio?: string
    barbero?: string
    requiere_aclaracion: boolean
    mensaje_cliente?: string
    pregunta?: string
    agendar_inmediato?: boolean
    error_parsing?: boolean
}

export async function processWhatsAppMessage(
    config: OpenAIConfig, 
    chatHistory: Message[], 
    newMessage: string
): Promise<{ intent: ExtractedIntent, newHistory: Message[] }> {
    
    // Initialize standard OpenAI client with the tenant's individual API key
    const openai = new OpenAI({
        apiKey: config.apiKey
    })

    // Construct full context
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: config.systemPrompt },
        ...chatHistory,
        { role: 'user', content: newMessage }
    ]

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: messages,
            response_format: { type: "json_object" }, // Force JSON response to match our struct
            temperature: 0.2 // Low temp for more deterministic extracting
        })

        const content = response.choices[0].message.content || '{}'
        const intent = JSON.parse(content) as ExtractedIntent

        // Append the assistant's reply (as JSON string context for future)
        const newHistory: Message[] = [
            ...chatHistory,
            { role: 'user', content: newMessage },
            { role: 'assistant', content: content } 
        ]

        return { intent, newHistory }

    } catch (error) {
        console.error('Error calling OpenAI:', error)
        return {
            intent: { requiere_aclaracion: true, pregunta: "Lo siento, tuve un problema procesando tu mensaje. ¿Puedes repetirlo?", error_parsing: true },
            newHistory: chatHistory // Don't save failed state
        }
    }
}
