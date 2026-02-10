import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types'

// Check if Supabase is configured
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Flag to check if we're in demo mode
export const isDemoMode = !SUPABASE_URL || !SUPABASE_ANON_KEY ||
    SUPABASE_URL === 'https://your-project.supabase.co' ||
    SUPABASE_URL === ''

// Mock Supabase client for demo mode
const createMockClient = () => {
    const mockQuery = () => ({
        select: (...args: any[]) => mockQuery(),
        insert: (...args: any[]) => mockQuery(),
        update: (...args: any[]) => mockQuery(),
        delete: (...args: any[]) => mockQuery(),
        eq: (...args: any[]) => mockQuery(),
        neq: (...args: any[]) => mockQuery(),
        gte: (...args: any[]) => mockQuery(),
        lte: (...args: any[]) => mockQuery(),
        or: (...args: any[]) => mockQuery(),
        order: (...args: any[]) => mockQuery(),
        single: () => Promise.resolve({ data: null, error: { message: 'Demo mode - no database connected' } }),
        then: (resolve: (value: { data: null; error: null }) => void) => resolve({ data: null, error: null })
    })

    return {
        from: (table: string) => mockQuery(),
        channel: () => ({
            on: () => ({ subscribe: () => ({ unsubscribe: () => { } }) }),
            subscribe: () => ({ unsubscribe: () => { } })
        }),
        removeChannel: () => { },
        auth: {
            getUser: () => Promise.resolve({ data: { user: null }, error: null }),
            signIn: () => Promise.resolve({ data: null, error: null }),
            signOut: () => Promise.resolve({ error: null }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } })
        }
    }
}

export function createClient(): ReturnType<typeof createBrowserClient<Database>> {
    if (isDemoMode) {
        console.log('🎭 BarberCloud running in DEMO MODE - No Supabase configured')
        return createMockClient() as unknown as ReturnType<typeof createBrowserClient<Database>>
    }

    return createBrowserClient<Database>(
        SUPABASE_URL!,
        SUPABASE_ANON_KEY!
    )
}

// Server-side client for API routes
export function createServerClient(supabaseUrl: string, supabaseKey: string) {
    return createBrowserClient<Database>(supabaseUrl, supabaseKey)
}
