// app/store/[slug]/account/register/page.tsx
'use client'

import { useState } from 'react'
import { useCustomerAuth } from '@/contexts/CustomerAuthContext'
import { createCustomerClient } from '@/lib/customer-client'
import Link from 'next/link'
import { use } from 'react'

export default function RegisterPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = use(params)
    const { signUp } = useCustomerAuth()
    const supabase = createCustomerClient()

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [done, setDone] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (password !== confirm) return setError('Passwords do not match')
        setLoading(true)
        setError(null)

        const { data: store } = await supabase
            .from('stores')
            .select('id')
            .eq('slug', slug)
            .eq('is_active', true)
            .single()

        if (!store) {
            setError('Store not found')
            return setLoading(false)
        }

        const { error } = await signUp(email, password, store.id)
        if (error) {
            setError(error.message)
            setLoading(false)
        } else {
            setDone(true)
        }
    }

    if (done) return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <div className="max-w-sm text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center mx-auto">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h2 className="text-xl font-light">Check your email</h2>
                <p className="text-sm text-muted-foreground">
                    We sent a confirmation link to <strong>{email}</strong>.
                    Click it to activate your account, then sign in.
                </p>
                <Link
                    href={`/store/${slug}/account/login`}
                    className="inline-block text-sm underline underline-offset-4"
                >
                    Back to sign in
                </Link>
            </div>
        </div>
    )

    return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <div className="w-full max-w-sm space-y-8">
                <div className="space-y-1">
                    <h1 className="text-2xl font-light tracking-tight">Create account</h1>
                    <p className="text-sm text-muted-foreground">Track orders and save favourites</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                            autoComplete="email"
                            className="w-full border-b border-gray-300 focus:border-black outline-none py-2 text-sm transition-colors bg-transparent"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                            minLength={6}
                            autoComplete="new-password"
                            className="w-full border-b border-gray-300 focus:border-black outline-none py-2 text-sm transition-colors bg-transparent"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Confirm password</label>
                        <input
                            type="password"
                            value={confirm}
                            onChange={e => setConfirm(e.target.value)}
                            required
                            autoComplete="new-password"
                            className="w-full border-b border-gray-300 focus:border-black outline-none py-2 text-sm transition-colors bg-transparent"
                        />
                    </div>

                    {error && <p className="text-sm text-red-500">{error}</p>}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-black text-white py-2.5 text-sm tracking-wide hover:bg-black/80 transition-colors disabled:opacity-40 mt-2"
                    >
                        {loading ? 'Creating account…' : 'Create account'}
                    </button>
                </form>

                <p className="text-center text-sm text-muted-foreground">
                    Already have an account?{' '}
                    <Link href={`/store/${slug}/account/login`} className="text-black underline underline-offset-4">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    )
}