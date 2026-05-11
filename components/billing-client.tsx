// components/settings/billing-client.tsx
'use client'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

const PRO_FEATURES = [
    { icon: 'language', label: 'Custom domain', desc: 'Connect your own domain name' },
    { icon: 'link', label: 'Integrations', desc: 'Payments, notifications, social media' },
    { icon: 'analytics', label: 'Analytics', desc: 'Sales and traffic insights' },
    { icon: 'palette', label: 'Advanced themes', desc: 'Full theme customization' },
    { icon: 'group', label: 'Team members', desc: 'Unlimited store members' },
    { icon: 'support_agent', label: 'Priority support', desc: 'Faster response times' },
]

export default function BillingClient({
    store,
    subscription,
    justActivated,
    slug,
}: {
    store: { id: string; name: string; is_pro: boolean }
    subscription: { status: string; amount: number; currency: string; created_at: string | null } | null
    justActivated?: boolean
    slug: string
}) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isPro, setIsPro] = useState(store.is_pro)

    useEffect(() => {
        if (justActivated) setIsPro(true)
    }, [justActivated])

    async function handleUpgrade() {
        setLoading(true)
        setError(null)
        try {
            const res = await fetch(`/api/store/${slug}/subscribe`, { method: 'POST' })
            const data = await res.json()
            if (data.url) {
                window.location.href = data.url
            } else {
                setError(data.error ?? 'Something went wrong')
            }
        } catch {
            setError('Network error — please try again')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-2xl space-y-8 mx-auto">

            {/* Just activated banner */}
            {justActivated && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
                    <span className="material-symbols-outlined text-green-600 dark:text-green-400">check_circle</span>
                    <div>
                        <p className="text-sm font-medium text-green-800 dark:text-green-200">
                            You're now on Pro! 🎉
                        </p>
                        <p className="text-xs text-green-700 dark:text-green-300">
                            All Pro features are now unlocked for {store.name}.
                        </p>
                    </div>
                </div>
            )}

            {/* Plan card */}
            <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                <div className="flex items-start justify-between">
                    <div>
                        <h2 className="text-base font-semibold text-foreground">
                            {isPro ? 'Pro Plan' : 'Free Plan'}
                        </h2>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            {isPro
                                ? `Active since ${subscription && subscription.created_at ? new Date(subscription.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}`
                                : 'Upgrade to unlock all features'
                            }
                        </p>
                    </div>
                    {isPro ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                            <span className="material-symbols-outlined text-[14px]">workspace_premium</span>
                            Pro
                        </span>
                    ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                            Free
                        </span>
                    )}
                </div>

                {!isPro && (
                    <>
                        <div className="h-px bg-border" />
                        <div className="flex items-end gap-1">
                            <span className="text-3xl font-bold text-foreground">KES 2,500</span>
                            <span className="text-sm text-muted-foreground mb-1">/ month</span>
                        </div>
                        {error && (
                            <p className="text-sm text-destructive">{error}</p>
                        )}
                        <button
                            onClick={handleUpgrade}
                            disabled={loading}
                            className={cn(
                                'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg',
                                'bg-primary text-primary-foreground text-sm font-medium',
                                'hover:bg-primary/90 transition-colors',
                                'disabled:opacity-60 disabled:cursor-not-allowed'
                            )}
                        >
                            {loading ? (
                                <>
                                    <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                                    Redirecting to checkout…
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-[16px]">workspace_premium</span>
                                    Upgrade to Pro
                                </>
                            )}
                        </button>
                    </>
                )}
            </div>

            {/* Pro features grid */}
            <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">
                    {isPro ? 'Your Pro features' : "What you'll unlock"}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {PRO_FEATURES.map(f => (
                        <div
                            key={f.label}
                            className={cn(
                                'flex items-start gap-3 p-3 rounded-lg border',
                                isPro
                                    ? 'border-border bg-card'
                                    : 'border-dashed border-border bg-muted/30'
                            )}
                        >
                            <span className={cn(
                                'material-symbols-outlined text-[20px] mt-0.5 shrink-0',
                                isPro ? 'text-primary' : 'text-muted-foreground'
                            )}>
                                {isPro ? f.icon : 'lock'}
                            </span>
                            <div>
                                <p className="text-sm font-medium text-foreground">{f.label}</p>
                                <p className="text-xs text-muted-foreground">{f.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    )
}