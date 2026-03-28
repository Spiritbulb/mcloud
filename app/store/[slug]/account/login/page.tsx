// app/store/[slug]/account/login/page.tsx
'use client'

import { useState } from 'react'
import { useCustomerAuth } from '@/contexts/CustomerAuthContext'
import Link from 'next/link'
import { use } from 'react'

export default function LoginPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = use(params)
    const { signIn } = useCustomerAuth()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        const { error } = await signIn(email, password)
        if (error) {
            setError('Invalid email or password')
            setLoading(false)
        }
        // layout's useEffect handles redirect on success
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <div className="w-full max-w-sm space-y-8">
                <div className="space-y-1">
                    <h1 className="text-2xl font-light tracking-tight">Sign in</h1>
                    <p className="text-sm text-muted-foreground">Welcome back</p>
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
                            autoComplete="current-password"
                            className="w-full border-b border-gray-300 focus:border-black outline-none py-2 text-sm transition-colors bg-transparent"
                        />
                    </div>

                    {error && (
                        <p className="text-sm text-red-500">{error}</p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-black text-white py-2.5 text-sm tracking-wide hover:bg-black/80 transition-colors disabled:opacity-40 mt-2"
                    >
                        {loading ? 'Signing in…' : 'Sign in'}
                    </button>
                </form>

                <p className="text-center text-sm text-muted-foreground">
                    No account?{' '}
                    <Link href={`/store/${slug}/account/register`} className="text-black underline underline-offset-4">
                        Create one
                    </Link>
                </p>
            </div>
        </div>
    )
}