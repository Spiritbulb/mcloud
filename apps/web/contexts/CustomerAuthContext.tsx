// contexts/CustomerAuthContext.tsx
'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { createCustomerClient } from '@/lib/customer-client'

interface CustomerAuthContextType {
    user: User | null
    session: Session | null
    loading: boolean
    signUp: (email: string, password: string, storeId: string) => Promise<{ error: Error | null }>
    signIn: (email: string, password: string) => Promise<{ error: Error | null }>
    signOut: () => Promise<void>
    refreshUser: () => Promise<void>
}

const CustomerAuthContext = createContext<CustomerAuthContextType | null>(null)

export function CustomerAuthProvider({ children }: { children: React.ReactNode }) {
    const supabase = createCustomerClient()
    const [user, setUser] = useState<User | null>(null)
    const [session, setSession] = useState<Session | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
            setUser(session?.user ?? null)
            setLoading(false)
        })

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session)
            setUser(session?.user ?? null)
        })

        return () => subscription.unsubscribe()
    }, [])

    const refreshUser = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
    }, [])

    const signUp = useCallback(async (email: string, password: string, storeId: string) => {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) return { error }

        if (data.user) {
            // Create the customers record linked to this store
            await supabase.from('customers').upsert({
                store_id: storeId,
                email,
                first_name: '',
                last_name: '',
            }, { onConflict: 'store_id,email', ignoreDuplicates: true })
        }

        return { error: null }
    }, [])

    const signIn = useCallback(async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        return { error: error ?? null }
    }, [])

    const signOut = useCallback(async () => {
        await supabase.auth.signOut()
    }, [])

    return (
        <CustomerAuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut, refreshUser }}>
            {children}
        </CustomerAuthContext.Provider>
    )
}

export function useCustomerAuth() {
    const ctx = useContext(CustomerAuthContext)
    if (!ctx) throw new Error('useCustomerAuth must be used within CustomerAuthProvider')
    return ctx
}