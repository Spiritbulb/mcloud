'use client'

import { QRCodeSVG } from 'qrcode.react'
import { useState, useTransition } from 'react'
import { Status, type BadgeTone } from '@mcloud/ui/kit/badge'
import { Button } from '@mcloud/ui/kit/button'
import { ConfirmDialog } from '@mcloud/ui/kit/confirm-dialog'
import { Field, Select, TextInput } from '@mcloud/ui/kit/form'
import { LoadError } from '@mcloud/ui/kit/load-error'
import { Notice } from '@mcloud/ui/kit/notice'
import { PageHeader } from '@mcloud/ui/kit/page-header'
import { Panel } from '@mcloud/ui/kit/panel'
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
        <Panel
            title="Where you deliver"
            description="Shoppers on Reach pick where they are, and only see stores that deliver there."
            footer={
                <Button
                    variant="primary"
                    disabled={pending || !dirty || !areaId}
                    onClick={() => run(() => saveReachLocation(storeId, { areaId, extraAreaIds: extra, payoutPhone: phone }), onSaved)}
                >
                    Save
                </Button>
            }
        >
            <div className="flex flex-col gap-5">
                <Field
                    label="Your area"
                    hint={status.areas.length === 0 ? 'No areas are set up yet. Reach adds them; check back soon.' : 'The area you deliver from.'}
                >
                    <Select
                        value={areaId}
                        onChange={(e) => {
                            setAreaId(e.target.value)
                            setExtra((cur) => cur.filter((x) => x !== e.target.value))
                        }}
                        className="max-w-sm"
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
                    </Select>
                </Field>

                <fieldset className="flex flex-col gap-2">
                    <legend className="mb-1.5 text-[12px] font-medium text-foreground">Also delivers to (optional)</legend>
                    <div className="flex max-h-64 flex-col gap-3 overflow-y-auto rounded-md border border-border p-3">
                        {groups.map(({ town, children }) => {
                            const options = [town, ...children].filter((a) => a.id !== areaId)
                            if (!options.length) return null
                            return (
                                <div key={town.id}>
                                    <p className="mb-1.5 text-[12px] font-medium text-muted-foreground">{town.name}</p>
                                    <div className="flex flex-wrap gap-2">
                                        {options.map((a) => (
                                            <button
                                                type="button"
                                                key={a.id}
                                                onClick={() => toggle(a.id)}
                                                aria-pressed={extra.includes(a.id)}
                                                className={cn(
                                                    'h-7 rounded-md border px-2.5 text-[12px] transition-colors',
                                                    extra.includes(a.id) ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card hover:bg-muted/60',
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

                <Field label="M-Pesa number for payouts" hint="Reach sends what you earn here after you mark orders delivered. Double-check it.">
                    <TextInput
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        inputMode="tel"
                        placeholder="0712 345 678"
                        className="max-w-xs"
                    />
                </Field>

                {movingApproved && (
                    <Notice tone="warning">
                        Changing your area sends your store back for review. It stays hidden from shoppers until Reach approves it again.
                    </Notice>
                )}
            </div>
        </Panel>
    )
}

function StatusPill({ status }: { status: ReachStatus }) {
    const tone: BadgeTone =
        status.approvalStatus === 'approved' && status.listed
            ? 'success'
            : status.approvalStatus === 'pending'
              ? 'warning'
              : status.approvalStatus === 'rejected' || status.approvalStatus === 'suspended'
                ? 'danger'
                : 'neutral'
    const text =
        status.approvalStatus === 'approved' && !status.listed ? 'Approved · not listed' : approvalLabel(status.approvalStatus)
    return <Status tone={tone}>{text}</Status>
}

function KeyRow({ k, busy, onRevoke }: { k: ReachKey; busy: boolean; onRevoke: (k: ReachKey) => void }) {
    const [reveal, setReveal] = useState(false)
    const [copied, setCopied] = useState(false)
    const [qr, setQr] = useState(false)

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
        <li className="flex flex-col gap-2 px-4 py-3.5">
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <p className={cn('text-[13px] font-semibold', k.active ? 'text-foreground' : 'text-muted-foreground line-through')}>
                        {k.label}
                    </p>
                    <p className="font-mono text-[13px] tracking-wide text-foreground mt-0.5 break-all">
                        {k.active && !reveal ? maskStoreKey(k.key) : k.key}
                    </p>
                    <p className="mt-1 text-[12px] text-muted-foreground">
                        {k.active ? `Created ${formatDate(k.created_at)}` : `Revoked ${formatDate(k.revoked_at ?? k.created_at)}`}
                    </p>
                </div>
                {k.active && (
                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                        <Button size="sm" onClick={() => setReveal((v) => !v)}>{reveal ? 'Hide' : 'Show'}</Button>
                        <Button size="sm" onClick={copy}>{copied ? 'Copied' : 'Copy'}</Button>
                        <Button size="sm" onClick={() => setQr((v) => !v)} aria-expanded={qr}>{qr ? 'Hide QR' : 'QR'}</Button>
                        <Button size="sm" variant="danger" onClick={() => onRevoke(k)} disabled={busy}>Revoke</Button>
                    </div>
                )}
            </div>
            {k.active && qr && (
                <div className="flex w-fit flex-wrap items-center gap-4 rounded-md border border-border p-4">
                    {/* White background and a quiet zone so phone cameras read it on a dark theme too. */}
                    <div className="bg-white p-3 rounded-md">
                        <QRCodeSVG value={k.key} size={132} level="M" marginSize={0} />
                    </div>
                    <p className="text-[12px] text-muted-foreground max-w-[220px]">
                        In the Reach app, choose <strong>I&apos;m selling</strong>, then <strong>Scan QR code</strong>. Anyone who scans this can open your store, so only show it to people you trust.
                    </p>
                </div>
            )}
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
    const [revoking, setRevoking] = useState<ReachKey | null>(null)

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

    const header = <PageHeader title="Reach marketplace" description="Sell on the Reach app alongside other stores nearby." />

    if (!status) {
        return (
            <div className="space-y-6">
                {header}
                <Panel>
                    <LoadError title="Couldn't load your Reach settings" message={error ?? undefined} onRetry={() => startTransition(refresh)} />
                </Panel>
            </div>
        )
    }

    const active = status.keys.filter((k) => k.active)
    const revoked = status.keys.filter((k) => !k.active)

    return (
        <div className="space-y-6">
            {header}
            {error && <Notice tone="error">{error}</Notice>}

            <Panel
                title="Marketplace listing"
                description="Whether shoppers on Reach can see your products."
                action={<StatusPill status={status} />}
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
                            <p className="text-[13px] text-red-700 dark:text-red-300">
                                Reach sent your request back: {status.reviewNote ?? 'please check your details'}. Fix it, then request again.
                            </p>
                        )}
                        {status.approvalStatus === 'suspended' && (
                            <p className="text-[13px] text-red-700 dark:text-red-300">
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
                                <Button
                                    onClick={() => run(() => setReachListed(storeId, !status.listed || status.approvalStatus === 'rejected'))}
                                    disabled={pending || (!status.areaId && !status.listed)}
                                    variant={status.listed && status.approvalStatus !== 'rejected' ? 'secondary' : 'primary'}
                                >
                                    {status.listed && status.approvalStatus !== 'rejected'
                                        ? 'Remove from Reach'
                                        : status.approvalStatus === 'approved'
                                          ? 'List my store'
                                          : 'Request to be listed'}
                                </Button>
                                {!status.areaId && !status.listed && (
                                    <p className="text-[12px] text-muted-foreground mt-2">Choose where you deliver first.</p>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </Panel>

            {!status.blocked && (
                <LocationSection key={`${status.areaId}-${status.extraAreaIds.join()}-${status.payoutPhone}`} storeId={storeId} status={status} onSaved={() => {}} run={run} pending={pending} />
            )}

            <Panel
                title="Store keys"
                description="A key lets someone open the Reach app as your store: see orders, mark them delivered and update stock."
                flush
                footer={<p className="mr-auto text-[12px] text-muted-foreground">{status.activeKeyCount} of {status.maxKeys} active keys used.</p>}
            >
                <form
                    className="flex flex-col gap-2 border-b border-border px-4 py-3.5 sm:flex-row"
                    onSubmit={(e) => {
                        e.preventDefault()
                        run(() => createStoreKey(storeId, label), () => setLabel(''))
                    }}
                >
                    <TextInput
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        maxLength={40}
                        placeholder="Who is this for? e.g. Counter phone"
                        aria-label="Key label"
                        className="h-8 flex-1"
                    />
                    <Button
                        type="submit"
                        variant="primary"
                        disabled={pending || !label.trim() || !!status.blocked || status.activeKeyCount >= status.maxKeys}
                    >
                        Create key
                    </Button>
                </form>

                {active.length === 0 ? (
                    <p className="px-4 py-6 text-[13px] text-muted-foreground">
                        No keys yet. Create one, then in the Reach app choose <strong>I&apos;m selling</strong> and enter it.
                    </p>
                ) : (
                    <ul className="divide-y divide-border">
                        {active.map((k) => (
                            <KeyRow
                                key={k.id}
                                k={k}
                                busy={pending}
                                onRevoke={setRevoking}
                            />
                        ))}
                    </ul>
                )}

                {revoked.length > 0 && (
                    <details className="border-t border-border">
                        <summary className="cursor-pointer px-4 py-3 text-[12px] text-muted-foreground hover:text-foreground">Revoked keys ({revoked.length})</summary>
                        <ul className="divide-y divide-border">
                            {revoked.map((k) => (
                                <KeyRow key={k.id} k={k} busy onRevoke={() => {}} />
                            ))}
                        </ul>
                    </details>
                )}
            </Panel>

            <ConfirmDialog
                open={!!revoking}
                title={`Revoke "${revoking?.label ?? ''}"?`}
                description="Anyone using this key is signed out of your store on Reach straight away. This can't be undone; create a new key to give access again."
                confirmLabel="Revoke key"
                busy={pending}
                onCancel={() => setRevoking(null)}
                onConfirm={() => {
                    const key = revoking
                    if (!key) return
                    // Close either way, so a failure's message on the page is not hidden behind the dialog.
                    run(async () => {
                        const res = await revokeStoreKey(storeId, key.id)
                        setRevoking(null)
                        return res
                    })
                }}
            />
        </div>
    )
}
