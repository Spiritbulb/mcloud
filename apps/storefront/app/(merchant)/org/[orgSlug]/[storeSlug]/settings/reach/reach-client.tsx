'use client'

import { useState, useTransition } from 'react'
import { cn } from '@mcloud/ui/utils'
import { maskStoreKey } from '@mcloud/merchant/reach'
import {
    createStoreKey,
    getReachStatus,
    revokeStoreKey,
    setReachListed,
    type ReachKey,
    type ReachStatus,
} from '@/lib/admin/reach-actions'
import { SettingsSection } from '../settings-primitives'

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
}

function KeyRow({ k, busy, onRevoke }: { k: ReachKey; busy: boolean; onRevoke: (k: ReachKey) => void }) {
    const [reveal, setReveal] = useState(false)
    const [copied, setCopied] = useState(false)

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(k.key)
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
        } catch {
            setReveal(true) // clipboard blocked: show it so it can be copied by hand
        }
    }

    return (
        <li className="px-6 py-4 flex flex-col gap-2">
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <p className={cn('text-[13px] font-semibold', k.active ? 'text-foreground' : 'text-muted-foreground line-through')}>
                        {k.label}
                    </p>
                    <p className="font-mono text-[13px] tracking-wide text-foreground mt-0.5 break-all">
                        {k.active && !reveal ? maskStoreKey(k.key) : k.key}
                    </p>
                    <p className="text-[11.5px] text-muted-foreground mt-1">
                        {k.active ? `Created ${formatDate(k.created_at)}` : `Revoked ${formatDate(k.revoked_at ?? k.created_at)}`}
                    </p>
                </div>
                {k.active && (
                    <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => setReveal((v) => !v)} className="h-8 px-3 rounded-full text-[12px] font-medium border border-border hover:bg-muted">
                            {reveal ? 'Hide' : 'Show'}
                        </button>
                        <button onClick={copy} className="h-8 px-3 rounded-full text-[12px] font-medium border border-border hover:bg-muted">
                            {copied ? 'Copied' : 'Copy'}
                        </button>
                        <button
                            onClick={() => onRevoke(k)}
                            disabled={busy}
                            className="h-8 px-3 rounded-full text-[12px] font-medium text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-50"
                        >
                            Revoke
                        </button>
                    </div>
                )}
            </div>
            {k.members.length > 0 && (
                <p className="text-[12px] text-muted-foreground">
                    In use by {k.members.map((m) => m.name || m.email || 'Someone').join(', ')}
                </p>
            )}
        </li>
    )
}

export default function ReachClient({
    storeId,
    storeName,
    initial,
    initialError,
}: {
    storeId: string
    storeName: string
    initial: ReachStatus | null
    initialError: string | null
}) {
    const [status, setStatus] = useState<ReachStatus | null>(initial)
    const [error, setError] = useState<string | null>(initialError)
    const [label, setLabel] = useState('')
    const [pending, startTransition] = useTransition()

    const refresh = async () => {
        const next = await getReachStatus(storeId)
        if (next.ok) {
            setStatus(next)
            setError(null)
        } else setError(next.error)
    }

    const run = (fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) =>
        startTransition(async () => {
            setError(null)
            const res = await fn()
            if (!res.ok) setError(res.error ?? 'Something went wrong')
            else after?.()
            await refresh()
        })

    if (!status) {
        return <p className="text-[13px] text-red-600">{error ?? 'Could not load Reach settings.'}</p>
    }

    const active = status.keys.filter((k) => k.active)
    const revoked = status.keys.filter((k) => !k.active)

    return (
        <div className="flex flex-col gap-6 max-w-3xl">
            {error && <p role="alert" className="text-[13px] text-red-600 rounded-lg border border-red-200 bg-red-50 px-4 py-3">{error}</p>}

            <SettingsSection
                title="Marketplace listing"
                description="Sell your products to shoppers on the Reach app, alongside other stores."
                aside={
                    <button
                        onClick={() => run(() => setReachListed(storeId, !status.listed))}
                        disabled={pending || (!status.listed && !!status.blocked)}
                        aria-pressed={status.listed}
                        className={cn(
                            'h-9 px-5 rounded-full text-[13px] font-semibold transition-opacity disabled:opacity-50',
                            status.listed ? 'bg-accent text-primary border border-border' : 'bg-primary text-primary-foreground',
                        )}
                    >
                        {status.listed ? 'Listed · Remove' : 'List my store'}
                    </button>
                }
            >
                {status.blocked ? (
                    <p className="text-[13px] text-muted-foreground">{status.blocked}</p>
                ) : status.listed ? (
                    <p className="text-[13px] text-foreground">
                        <strong>{storeName}</strong> is on Reach with {status.productCount} active product{status.productCount === 1 ? '' : 's'}.
                        Shoppers see your products with your store name; you keep managing prices and stock here or in the app.
                        Removing your store hides your products from Reach. Your keys keep working so you can finish orders already placed.
                    </p>
                ) : (
                    <p className="text-[13px] text-muted-foreground">
                        Not listed. When you list your store, your {status.productCount} active product{status.productCount === 1 ? '' : 's'} appear on Reach and orders
                        are paid to Reach first, then released to you once you mark them delivered.
                    </p>
                )}
            </SettingsSection>

            <SettingsSection
                title="Store keys"
                description="A store key lets someone open the Reach app as your store to see orders, mark them delivered and update stock. Revoke a key to end that person's access straight away."
                noPadding
            >
                <form
                    className="px-6 py-4 flex flex-col sm:flex-row gap-3 border-b border-border"
                    onSubmit={(e) => {
                        e.preventDefault()
                        run(() => createStoreKey(storeId, label), () => setLabel(''))
                    }}
                >
                    <input
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        maxLength={40}
                        placeholder="Who is this for? e.g. Counter phone"
                        aria-label="Key label"
                        className="flex-1 h-10 rounded-lg border border-border bg-background px-3 text-[13px] outline-none focus:border-primary"
                    />
                    <button
                        type="submit"
                        disabled={pending || !label.trim() || !!status.blocked || status.activeKeyCount >= status.maxKeys}
                        className="h-10 px-5 rounded-full bg-primary text-primary-foreground text-[13px] font-semibold disabled:opacity-50"
                    >
                        Create key
                    </button>
                </form>

                {active.length === 0 ? (
                    <p className="px-6 py-6 text-[13px] text-muted-foreground">
                        No keys yet. Create one, then in the Reach app choose <strong>Vendor</strong> and enter it.
                    </p>
                ) : (
                    <ul className="divide-y divide-border">
                        {active.map((k) => (
                            <KeyRow
                                key={k.id}
                                k={k}
                                busy={pending}
                                onRevoke={(key) => {
                                    if (window.confirm(`Revoke "${key.label}"? Anyone using it will be signed out of your store on Reach.`)) {
                                        run(() => revokeStoreKey(storeId, key.id))
                                    }
                                }}
                            />
                        ))}
                    </ul>
                )}

                {revoked.length > 0 && (
                    <details className="border-t border-border">
                        <summary className="px-6 py-3 text-[12.5px] text-muted-foreground cursor-pointer">Revoked keys ({revoked.length})</summary>
                        <ul className="divide-y divide-border">
                            {revoked.map((k) => (
                                <KeyRow key={k.id} k={k} busy onRevoke={() => {}} />
                            ))}
                        </ul>
                    </details>
                )}
                <p className="px-6 py-3 border-t border-border text-[11.5px] text-muted-foreground">
                    {status.activeKeyCount} of {status.maxKeys} active keys used.
                </p>
            </SettingsSection>
        </div>
    )
}
