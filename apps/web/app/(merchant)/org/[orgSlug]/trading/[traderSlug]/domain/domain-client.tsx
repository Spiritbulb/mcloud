'use client'

import { useState, useTransition } from 'react'

type VercelStatus = { verified: boolean; misconfigured: boolean; domain: string | null }

type Props = {
    app: { slug: string; custom_domain: string | null }
    orgSlug: string
    traderSlug: string
}

export default function DomainClient({ app, orgSlug, traderSlug }: Props) {
    const [domain, setDomain] = useState(app.custom_domain ?? '')
    const [status, setStatus] = useState<VercelStatus | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [saved, setSaved] = useState(false)
    const [isPending, start] = useTransition()

    const save = (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setSaved(false)
        setStatus(null)
        start(async () => {
            const res = await fetch('/api/trading/domain', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ traderSlug, domain }),
            })
            const data = await res.json()
            if (!res.ok) { setError(data.error ?? 'Failed to save domain'); return }
            setSaved(true)
            check()
        })
    }

    const check = () => {
        start(async () => {
            const res = await fetch(`/api/trading/domain?traderSlug=${encodeURIComponent(traderSlug)}`)
            const data = await res.json()
            if (res.ok) setStatus(data)
        })
    }

    const remove = () => {
        setError(null)
        start(async () => {
            const res = await fetch('/api/trading/domain', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ traderSlug }),
            })
            if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Failed'); return }
            setDomain('')
            setStatus(null)
            setSaved(false)
        })
    }

    return (
        <div className="max-w-2xl space-y-8">
            <div>
                <h1 className="text-[16px] font-semibold text-[var(--md-sys-color-on-surface)]">Domain</h1>
                <p className="text-[12px] text-[var(--md-sys-color-on-surface-variant)] mt-0.5">
                    Connect a custom domain to this trading app. Point your DNS to Vercel before verifying.
                </p>
            </div>

            <form onSubmit={save} className="rounded-xl border border-[var(--md-sys-color-outline-variant)] p-5 space-y-4">
                <p className="text-[12px] font-semibold tracking-widest uppercase text-[var(--md-sys-color-on-surface-variant)] opacity-60">Custom domain</p>

                <div className="flex gap-3">
                    <input
                        value={domain}
                        onChange={e => setDomain(e.target.value.trim().toLowerCase().replace(/^https?:\/\//, ''))}
                        placeholder="trading.yourbrand.com"
                        className="flex-1 h-10 rounded-xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-variant)]/30 px-4 text-[14px] font-mono focus:outline-none focus:border-[var(--md-sys-color-primary)] focus:ring-2 focus:ring-[var(--md-sys-color-primary)]/15 transition-all"
                    />
                    <button
                        type="submit"
                        disabled={isPending || !domain}
                        className="h-10 px-5 rounded-full bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] text-[13px] font-medium hover:opacity-90 disabled:opacity-40 transition-all flex items-center gap-2"
                    >
                        {isPending && <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                        Save
                    </button>
                </div>

                {saved && (
                    <p className="text-[12px] text-[var(--md-sys-color-primary)] flex items-center gap-1.5">
                        <span className="material-symbols-outlined select-none leading-none text-[16px]">check_circle</span>
                        Domain saved and registered with Vercel
                    </p>
                )}

                {error && <p className="text-[13px] text-[var(--md-sys-color-error)]">{error}</p>}

                {app.custom_domain && (
                    <button type="button" onClick={remove} disabled={isPending}
                        className="text-[12px] text-[var(--md-sys-color-error)] hover:underline disabled:opacity-40">
                        Remove domain
                    </button>
                )}
            </form>

            {/* Verification status */}
            <div className="rounded-xl border border-[var(--md-sys-color-outline-variant)] p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <p className="text-[12px] font-semibold tracking-widest uppercase text-[var(--md-sys-color-on-surface-variant)] opacity-60">Verification</p>
                    <button type="button" onClick={check} disabled={isPending || !app.custom_domain}
                        className="text-[12px] text-[var(--md-sys-color-primary)] hover:underline disabled:opacity-40">
                        Check status
                    </button>
                </div>

                {status ? (
                    <div className="space-y-2">
                        <StatusRow label="Domain" value={status.domain ?? '—'} />
                        <StatusRow
                            label="Verified"
                            value={status.verified ? 'Yes' : 'No'}
                            ok={status.verified}
                            warn={!status.verified}
                        />
                        {status.misconfigured && (
                            <StatusRow label="Misconfigured" value="DNS records may be incorrect" warn />
                        )}
                    </div>
                ) : (
                    <p className="text-[13px] text-[var(--md-sys-color-on-surface-variant)]">
                        {app.custom_domain ? 'Click "Check status" to verify DNS.' : 'No domain configured yet.'}
                    </p>
                )}

                {app.custom_domain && !status?.verified && (
                    <div className="rounded-lg bg-[var(--md-sys-color-surface-variant)]/40 p-4 space-y-2 text-[12px] text-[var(--md-sys-color-on-surface-variant)]">
                        <p className="font-medium text-[var(--md-sys-color-on-surface)]">DNS instructions</p>
                        <p>Add a CNAME record pointing <code className="font-mono bg-[var(--md-sys-color-surface-variant)] px-1 rounded">{app.custom_domain}</code> to <code className="font-mono bg-[var(--md-sys-color-surface-variant)] px-1 rounded">cname.vercel-dns.com</code></p>
                        <p>Or add an A record pointing to <code className="font-mono bg-[var(--md-sys-color-surface-variant)] px-1 rounded">76.76.21.21</code></p>
                    </div>
                )}
            </div>
        </div>
    )
}

function StatusRow({ label, value, ok, warn }: { label: string; value: string; ok?: boolean; warn?: boolean }) {
    return (
        <div className="flex items-center justify-between text-[13px]">
            <span className="text-[var(--md-sys-color-on-surface-variant)]">{label}</span>
            <span className={ok ? 'text-[var(--md-sys-color-primary)]' : warn ? 'text-[var(--md-sys-color-error)]' : 'text-[var(--md-sys-color-on-surface)]'}>
                {value}
            </span>
        </div>
    )
}
