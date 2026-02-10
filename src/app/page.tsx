'use client'

import Link from 'next/link'

export default function Home() {
    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900" />
            <div
                className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-20"
                style={{ background: 'var(--gradient-brand)' }}
            />
            <div
                className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full blur-3xl opacity-10"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #fbbf24)' }}
            />

            {/* Content */}
            <div className="relative z-10 text-center px-6 animate-fade-in">
                {/* Logo */}
                <div className="mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-600 to-purple-400 shadow-lg shadow-purple-500/30 mb-6">
                        <svg
                            className="w-10 h-10 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                        </svg>
                    </div>
                    <h1 className="text-5xl md:text-6xl font-bold mb-4">
                        <span className="gradient-text">BarberCloud</span>
                        <span className="text-white"> AI</span>
                    </h1>
                    <p className="text-xl text-slate-400 max-w-xl mx-auto">
                        Sistema inteligente de gestión de citas con IA conversacional para WhatsApp
                    </p>
                </div>

                {/* Navigation Cards */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center mt-12">
                    <Link
                        href="/tablet"
                        className="group glass-card px-8 py-6 hover:scale-105 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
                                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <div className="text-left">
                                <h3 className="text-lg font-semibold text-white">App Tablet</h3>
                                <p className="text-sm text-slate-400">Vista para barberos</p>
                            </div>
                        </div>
                    </Link>

                    <Link
                        href="/admin"
                        className="group glass-card px-8 py-6 hover:scale-105 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/20"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center group-hover:bg-amber-500/30 transition-colors">
                                <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                            <div className="text-left">
                                <h3 className="text-lg font-semibold text-white">Panel Admin</h3>
                                <p className="text-sm text-slate-400">Gestión y reportes</p>
                            </div>
                        </div>
                    </Link>
                </div>

                {/* Footer */}
                <p className="mt-16 text-sm text-slate-600">
                    Desarrollado con Next.js, Supabase y OpenAI GPT-4o
                </p>
            </div>
        </div>
    )
}
