'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function TabletLoginPage() {
    const router = useRouter()
    const [usuario, setUsuario] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const supabase = createClient()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            // Check credentials against barberos table
            // Note: In a real app we'd use a more secure auth method or RPC
            // Matching the implementation from BarberoModal (hashed_ prefix)
            const passwordHash = `hashed_${password}`

            const { data: barberos, error: dbError } = await supabase
                .from('barberos')
                .select('*')
                .eq('usuario_tablet', usuario)
                .eq('activo', true) // Only active barbers
                .limit(1)

            if (dbError) throw dbError

            const barbero = barberos?.[0]

            if (barbero && barbero.password_hash === passwordHash) {
                // Success
                localStorage.setItem('barbero_session', JSON.stringify(barbero))
                router.push('/tablet')
            } else {
                setError('Usuario o contraseña incorrectos')
            }
        } catch (err) {
            console.error('Login error:', err)
            setError('Error al conectar con el servidor')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900/30 to-slate-900" />
            <div
                className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-3xl opacity-20"
                style={{ background: 'var(--gradient-brand)' }}
            />

            {/* Login Card */}
            <div className="relative z-10 w-full max-w-md px-6">
                <div className="glass-card p-8 animate-slide-in">
                    {/* Logo */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-purple-400 shadow-lg shadow-purple-500/30 mb-4">
                            <svg
                                className="w-8 h-8 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                                />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold text-white">Acceso Tablet</h1>
                        <p className="text-slate-400 mt-2">Ingresa a tu estación de trabajo</p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleLogin} className="space-y-5">
                        <div>
                            <label htmlFor="usuario" className="block text-sm font-medium text-slate-300 mb-2">
                                Usuario
                            </label>
                            <input
                                id="usuario"
                                type="text"
                                value={usuario}
                                onChange={(e) => setUsuario(e.target.value)}
                                className="input-field"
                                placeholder="Ej. carlos01"
                                autoComplete="username"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                                Contraseña
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="input-field"
                                placeholder="••••••••"
                                autoComplete="current-password"
                            />
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="spinner" />
                                    Ingresando...
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                                    </svg>
                                    Ingresar
                                </>
                            )}
                        </button>
                    </form>

                    {/* Help Text */}
                    <p className="text-center text-slate-500 text-sm mt-6">
                        ¿Problemas para acceder? Contacta al administrador
                    </p>
                </div>
            </div>
        </div>
    )
}
