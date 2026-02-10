'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

interface AuthContextType {
    user: User | null
    loading: boolean
    sucursalId: string
    isAdmin: boolean
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    sucursalId: '1',
    isAdmin: false
})

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const [isAdmin, setIsAdmin] = useState(false)
    const SUCURSAL_ID = '1' // Todo: load from user profile

    const supabase = createClient()

    useEffect(() => {
        const checkUser = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                setUser(user)

                if (user && user.email) {
                    // Check if admin
                    const { data } = await supabase
                        .from('usuarios_admin')
                        .select('rol')
                        .eq('email', user.email)
                        .single()

                    if (data) setIsAdmin(true)
                }
            } catch (error) {
                console.error('Auth check error:', error)
            } finally {
                setLoading(false)
            }
        }

        checkUser()

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null)
            setLoading(false)
        })

        return () => subscription.unsubscribe()
    }, [supabase])

    return (
        <AuthContext.Provider value={{ user, loading, sucursalId: SUCURSAL_ID, isAdmin }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)
