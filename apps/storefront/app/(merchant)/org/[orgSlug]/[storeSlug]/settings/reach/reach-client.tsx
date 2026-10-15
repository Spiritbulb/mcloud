'use client'

import { useState, useTransition } from 'react'
import { cn } from '@mcloud/ui/utils'
import { maskStoreKey } from '@mcloud/merchant/reach'
import { areaLabel, type Area } from '@mcloud/merchant/reach-areas'
import { approvalLabel } from '@mcloud/merchant/reach-approval'
import {
    createStoreKey,
    getReachStatus,
    revokeStoreKey,
    saveReachLocation,
    setReachListed,
    type ReachKey,
    type ReachStatus,
} from '@/lib/admin/reach-actions'
import { SettingsSection } from '../settings-primitives'

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Towns with the areas inside them, for the pickers. Towns themselves are selectable too. */
function groupAreas(areas: Area[]) {
    const towns = areas.filter((a) => !a.parent_id)
    return towns.map((t) => ({ town: t, children: areas.filter((a) => a.parent_id === t.id) }))
}

function LocationSection({
    storeId,
    status,
    onSaved,
    run,
    pending,
}: {
    storeId: string
    status: ReachStatus
    onSaved: () => void
    run: (fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) => void
    pending: boolean
}) {
    const [areaId, setAreaId] = useState(status.areaId ?? '')
    const [extra, setExtra] = useState<string[]>(status.extraAreaIds)
    const [phone, setPhone] = useState(status.payoutPhone ?? '')
    const groups = groupAreas(status.areas)
    const dirty =
        areaId !== (status.areaId ?? '') ||
        phone !== (status.payoutPhone ?? '') ||
        [...extra].sort().join() !== [...status.extraAreaIds].sort().join()
    const movingApproved = status.approvalStatus === 'approved' && status.areaId && areaId !== status.areaId

    const toggle = (id: string) => setExtra((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))

    return (
        <SettingsSection
            title="Where you deliver"
            description="Shoppers on Reach pick where they are, and only see stores that deliver there. Choose the area you deliver from, and any other areas close enough to reach."
        >
            <div className="flex flex-col gap-5">
                <label className="flex flex-col gap-1.5">
                    <span className="text-[12.5px] font-semibold text-foreground">Your area</span>
                    <select
                        value={areaId}
                        onChange={(e) => {
                            setAreaId(e.target.value)
                            setExtra((cur) => cur.filter((x) => x !== e.target.value))
                        }}
                        className="h-10 rounded-lg border border-border bg-background px-3 text-[13px]"
                    >
                        <option value="">Choose an area…</option>
                        {groups.map(({ town, children }) => (
                            <optgroup key={town.id} label={town.name}>
                                <option value={town.id}>{town.name} (whole town)</option>
                                {children.map((c) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </optgroup>
                        ))}
                    </select>
                    {status.areas.length === 0 && (
                        <span className="text-[12px] text-muted-foreground">No areas are set up yet. Reach adds them; check back soon.</span>
                    )}
                </label>

                <fieldset className="flex flex-col gap-2">
                    <legend className="text-[12.5px] font-semibold text-foreground">Also delivers to (optional)</legend>
                    <div className="flex flex-col gap-3 max-h-64 overflow-y-auto rounded-lg border border-border p-3">
                        {groups.map(({ town, children }) => {
                            const options = [town, ...children].filter((a) => a.id !== areaId)
                            if (!options.length) return null
                            return (
                                <div key={town.id}>
                                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">{town.name}</p>
                                    <div className="flex flex-wrap gap-2">
                                        {options.map((a) => (
                                            <button
                                                type="button"
                                                key={a.id}
                                                onClick={() => toggle(a.id)}
                                                aria-pressed={extra.includes(a.id)}
                                                className={cn(
                                                    'h-8 px-3 rounded-full text-[12px] font-medium border transition-colors',
                                                    extra.includes(a.id) ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted',
                                                )}
                                            >
                                                {a.id === town.id ? `All of ${a.name}` : a.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </fieldset>

                <label className="flex flex-col gap-1.5">
                    <span className="text-[12.5px] font-semibold text-foreground">M-Pesa number for payouts</span>
                    <input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        inputMode="tel"
                        placeholder="0712 345 678"
                        className="h-10 rounded-lg border border-border bg-background px-3 text-[13px] max-w-xs"
                    />
                    <span className="text-[12px] text-muted-foreground">Reach sends what you earn here after you mark orders delivered. Double-check it.</span>
                </label>

                {movingApproved && (
                    <p className="text-[12.5px] text-amber-700 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                        Changing your area sends your store back for review. It stays hidden from shoppers until Reach approves it again.
                    </p>
                )}

                <div>
                    <button
                        type="button"
                        disabled={pending || !dirty || !areaId}
                        onClick={() => run(() => saveReachLocation(storeId, { areaId, extraAreaIds: extra, payoutPhone: phone }), onSaved)}
                        className="h-10 px-6 rounded-full bg-primary text-primary-foreground text-[13px] font-semibold disabled:opacity-50"
                    >
                        Save
                    </button>
                </div>
            </div>
        </SettingsSection>
    )
}

function StatusPill({ status }: { status: ReachStatus }) {
    const tone =
        status.approvalStatus === 'approved' && status.listed
            ? 'bg-green-100 text-green-700'
            : status.approvalStatus === 'pending'
              ? 'bg-amber-100 text-amber-700'
              : status.approvalStatus === 'rejected' || status.approvalStatus === 'suspended'
                ? 'bg-red-100 text-red-700'
                : 'bg-muted text-muted-foreground'
    const text =
        status.approvalStatus === 'approved' && !status.listed ? 'Approved · not listed' : approvalLabel(status.approvalStatus)
    return <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider', tone)}>{text}</span>
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
                description="Sell your products to shoppers on the Reach app, alongside other stores nearby."
                aside={<StatusPill status={status} />}
            >
                {status.blocked ? (
                    <p className="text-[13px] text-muted-foreground">{status.blocked}</p>
                ) : (
                    <div className="flex flex-col gap-4">
                        {status.approvalStatus === 'approved' && status.listed && (
                            <p className="text-[13px] text-foreground">
                                <strong>{storeName}</strong> is live in {areaLabel(status.areas, status.areaId) || 'your area'} with {status.productCount} active product{status.productCount === 1 ? '' : 's'}.
                                Orders are paid to Reach first, then released to you when you mark them delivered. Removing your store hides your products;
                                your keys keep working so you can finish orders already placed.
                            </p>
                        )}
                        {status.approvalStatus === 'pending' && (
                            <p className="text-[13px] text-foreground">
                                Reach is reviewing your request. You can set up keys and stock meanwhile; shoppers will not see your products until you are approved.
                            </p>
                        )}
                        {status.approvalStatus === 'rejected' && (
                            <p className="text-[13px] text-red-700">
                                Reach sent your request back: {status.reviewNote ?? 'please check your details'}. Fix it, then request again.
                            </p>
                        )}
                        {status.approvalStatus === 'suspended' && (
                            <p className="text-[13px] text-red-700">
                                Reach has paused your store{status.reviewNote ? `: ${status.reviewNote}` : '.'} Contact Reach support to be reinstated.
                            </p>
                        )}
                        {(status.approvalStatus === 'draft' || (status.approvalStatus === 'approved' && !status.listed)) && (
                            <p className="text-[13px] text-muted-foreground">
                                {status.approvalStatus === 'draft'
                                    ? `Choose your area below, then ask to be listed. Reach reviews every store before shoppers see it. You have ${status.productCount} active product${status.productCount === 1 ? '' : 's'}.`
                                    : 'Your store is approved but switched off. List it again whenever you are ready.'}
                            </p>
                        )}

                        {status.approvalStatus !== 'suspended' && status.approvalStatus !== 'pending' && (
                            <div>
                                <button
                                    onClick={() => run(() => setReachListed(storeId, !status.listed || status.approvalStatus === 'rejected'))}
                                    disabled={pending || (!status.areaId && !status.listed)}
                                    className={cn(
                                        'h-9 px-5 rounded-full text-[13px] font-semibold transition-opacity disabled:opacity-50',
                                        status.listed && status.approvalStatus !== 'rejected'
                                            ? 'bg-accent text-primary border border-border'
                                            : 'bg-primary text-primary-foreground',
                                    )}
                                >
                                    {status.listed && status.approvalStatus !== 'rejected'
                                        ? 'Remove from Reach'
                                        : status.approvalStatus === 'approved'
                                          ? 'List my store'
                                          : 'Request to be listed'}
                                </button>
                                {!status.areaId && !status.listed && (
                                    <p className="text-[12px] text-muted-foreground mt-2">Choose where you deliver first.</p>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </SettingsSection>

            {!status.blocked && (
                <LocationSection key={`${status.areaId}-${status.extraAreaIds.join()}-${status.payoutPhone}`} storeId={storeId} status={status} onSaved={() => {}} run={run} pending={pending} />
            )}

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
