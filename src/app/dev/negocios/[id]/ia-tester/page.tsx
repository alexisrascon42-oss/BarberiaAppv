'use client'

import { useState, useRef, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface Message {
    id: string
    role: 'user' | 'ai' | 'system'
    text: string
    time: Date
}

export default function ChatTester() {
    const params = useParams()
    const sucursalId = params.id as string

    const [messages, setMessages] = useState<Message[]>([
        { id: '1', role: 'system', text: 'Bienvenido al Tester de IA. Estás interactuando con el LLM aislado sin usar WhatsApp. Las consultas a la base de datos se harán apuntando al negocio (ID arriba).', time: new Date() }
    ])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [phone] = useState('555-DEV-TEST')
    
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages, isLoading])

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!input.trim() || isLoading) return

        const userText = input.trim()
        setInput('')
        
        const userMsg: Message = { id: Date.now().toString(), role: 'user', text: userText, time: new Date() }
        setMessages(prev => [...prev, userMsg])
        setIsLoading(true)

        try {
            const res = await fetch('/api/dev/chat-debug', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userText,
                    sucursalId,
                    senderPhone: phone,
                    sessionId: 'dev-session-v1'
                })
            })

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || 'Error del servidor IA')
            }

            const data = await res.json()
            
            const aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'ai', text: data.response, time: new Date() }
            setMessages(prev => [...prev, aiMsg])

        } catch (error: any) {
            const errorMsg: Message = { id: Date.now().toString(), role: 'system', text: 'Error: ' + error.message, time: new Date() }
            setMessages(prev => [...prev, errorMsg])
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center pt-8 px-4">
            <div className="w-full max-w-md bg-slate-800 rounded-3xl shadow-2xl border border-slate-700/50 overflow-hidden flex flex-col h-[750px] max-h-[90vh]">
                
                {/* Header estilo App de Mensajería */}
                <header className="bg-slate-800 border-b border-slate-700 p-4 shrink-0 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/dev/negocios" className="text-slate-400 hover:text-white transition-colors">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </Link>
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center shadow-lg shadow-fuchsia-900/40">
                            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-white font-bold leading-tight">Agente IA (Tester)</h2>
                            <p className="text-[10px] text-fuchsia-400 font-mono tracking-wider">{sucursalId.slice(0, 8)}... EN LÍNEA</p>
                        </div>
                    </div>
                </header>

                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900/50 scrollbar-hide" style={{ backgroundImage: "radial-gradient(ellipse at center, rgba(30,41,59,0) 0%, rgba(15,23,42,1) 100%)" }}>
                    
                    {messages.map((m) => (
                        <div key={m.id} className={`flex flex-col max-w-[85%] ${m.role === 'user' ? 'ml-auto items-end' : m.role === 'system' ? 'mx-auto items-center' : 'mr-auto items-start'}`}>
                            {m.role === 'system' ? (
                                <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500/80 text-[10px] uppercase font-bold px-3 py-1.5 rounded-full text-center max-w-full leading-snug">
                                    {m.text}
                                </div>
                            ) : (
                                <>
                                    <div className={`px-4 py-2.5 rounded-2xl whitespace-pre-wrap text-[15px] ${
                                        m.role === 'user' 
                                            ? 'bg-emerald-600 text-white rounded-br-none shadow-md shadow-emerald-900/20' 
                                            : 'bg-slate-700 text-slate-100 rounded-bl-none shadow-md shadow-black/20'
                                    }`}>
                                        {m.text}
                                    </div>
                                    <span className="text-[10px] text-slate-500 mt-1 font-mono uppercase px-1">
                                        {m.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </>
                            )}
                        </div>
                    ))}

                    {/* Typing Indicator */}
                    {isLoading && (
                        <div className="flex flex-col mr-auto items-start max-w-[85%]">
                            <div className="bg-slate-700 px-4 py-3 rounded-2xl rounded-bl-none flex gap-1 items-center">
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="bg-slate-800 border-t border-slate-700 p-3 shrink-0">
                    <form onSubmit={handleSend} className="flex gap-2 items-end">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault()
                                    handleSend(e)
                                }
                            }}
                            placeholder="Escribe un mensaje de prueba..."
                            className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-2xl px-4 py-3 text-[15px] resize-none h-[50px] max-h-[120px] focus:outline-none focus:border-fuchsia-500/50 transition-colors scrollbar-hide"
                            rows={1}
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || isLoading}
                            className="w-12 h-12 rounded-full bg-fuchsia-600 hover:bg-fuchsia-500 disabled:bg-slate-700 disabled:text-slate-500 text-white flex items-center justify-center shrink-0 transition-colors shadow-lg shadow-fuchsia-900/30"
                        >
                            <svg className="w-5 h-5 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                        </button>
                    </form>
                </div>

            </div>
            
            <p className="mt-4 text-xs text-slate-500 font-mono">Simulador de Agente BarberCloud | Teléfono: {phone}</p>
        </div>
    )
}
