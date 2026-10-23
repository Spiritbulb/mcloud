'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Button, buttonClass } from '@mcloud/ui/kit/button'
import { ConfirmDialog } from '@mcloud/ui/kit/confirm-dialog'
import { Field, FormGrid, Select, TextInput } from '@mcloud/ui/kit/form'
import { Icon } from '@mcloud/ui/kit/icon'
import { LoadError } from '@mcloud/ui/kit/load-error'
import { Notice } from '@mcloud/ui/kit/notice'
import { PageHeader } from '@mcloud/ui/kit/page-header'
import { Panel } from '@mcloud/ui/kit/panel'
import { Skeleton, Spinner } from '@mcloud/ui/kit/skeleton'
import { Tabs } from '@mcloud/ui/kit/tabs'
import { cn } from '@mcloud/ui/utils'
import { getPlanEurPrice } from '@/lib/pricing-dc'
import { centsToKes, hourlyRateCentsForMonthlyKes } from '@/lib/wallet-math'
import 'flag-icons/css/flag-icons.min.css'
import {
    GREEN_ZONES, OS_FAMILIES, ZONE_META, DEFAULT_ZONE,
    defaultZone, formatKes, formatMemory, isRecommendedZone, isValidHostname, plansInTier, planUseCase, sortZones, templatesByFamily,
    type OsFamily, type Plan, type PlanTier, type Template, type Zone,
} from './new-server-logic'

type Options = { zones: Zone[]; plans: Plan[]; templates: Template[]; kesPrices: Record<string, number> }

const TIERS: { id: PlanTier; label: string; description: string; from: string }[] = [
    { id: 'Starter', label: 'Starter', description: 'For sites, APIs, bots and development work.', from: 'STARTER-1xCPU-1GB' },
    { id: 'Premium', label: 'Premium', description: 'For growing production workloads and databases.', from: 'PREMIUM-1xCPU-1GB' },
]

/** A large selectable card (zone, plan, OS). A radio in a group, so arrow keys are not expected. */
function OptionCard({ selected, onSelect, className, children }: {
    selected: boolean
    onSelect: () => void
    className?: string
    children: React.ReactNode
}) {
    return (
        <button
            type="button"
            aria-pressed={selected}
            onClick={onSelect}
            className={cn(
                'relative rounded-lg border bg-card p-3 text-left transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
                selected ? 'border-primary ring-1 ring-primary' : 'border-border hover:border-foreground/30',
                className,
            )}
        >
            {children}
            {selected && <Icon name="check_circle" size={16} className="absolute right-2.5 top-2.5 text-primary" />}
        </button>
    )
}

function Flag({ zoneId, className }: { zoneId: string; className?: string }) {
    const flag = ZONE_META[zoneId]?.flag
    return <span aria-hidden className={cn('fi shrink-0 rounded-[2px]', flag && `fi-${flag}`, className)} />
}

function zoneLabel(zone: Zone | undefined): string {
    if (!zone) return 'Choose a location'
    const meta = ZONE_META[zone.id]
    return meta ? `${meta.city}, ${meta.country}` : zone.description
}

function SummaryRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-baseline justify-between gap-3 py-1.5 text-[13px]">
            <span className="shrink-0 text-muted-foreground">{label}</span>
            <span className="truncate text-right text-foreground">{value}</span>
        </div>
    )
}

// ─── Key reveal (after create) ────────────────────────────────────────────────

function KeyReveal({ orgSlug, privateKey, hostname }: { orgSlug: string; privateKey: string; hostname: string }) {
    const [copied, setCopied] = useState<'key' | 'ssh' | null>(null)
    const copy = (what: 'key' | 'ssh', text: string) =>
        navigator.clipboard.writeText(text).then(() => {
            setCopied(what)
            window.setTimeout(() => setCopied(null), 2000)
        }, () => {})

    const download = () => {
        const url = URL.createObjectURL(new Blob([privateKey], { type: 'text/plain' }))
        const a = document.createElement('a')
        a.href = url
        a.download = `${hostname}.pem`
        a.click()
        URL.revokeObjectURL(url)
    }

    const ssh = `ssh -i ${hostname}.pem root@${hostname}`

    return (
        <div className="mx-auto max-w-xl space-y-6">
            <PageHeader title="Server created" description="Save its private key now. It is shown only once and is not stored anywhere." />
            <Notice tone="warning">Keep the key in a password manager or a safe folder. Without it you cannot sign in to the server.</Notice>
            <Panel
                title="Private key"
                footer={
                    <>
                        <Button onClick={() => copy('key', privateKey)}>
                            <Icon name={copied === 'key' ? 'check' : 'content_copy'} size={14} />
                            {copied === 'key' ? 'Copied' : 'Copy'}
                        </Button>
                        <Button variant="primary" onClick={download}>
                            <Icon name="download" size={14} />
                            Download {hostname}.pem
                        </Button>
                    </>
                }
            >
                <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-all rounded-md bg-muted p-3 font-mono text-[11px] leading-relaxed text-foreground">{privateKey}</pre>
            </Panel>
            <Panel title="Connect" description="New servers can take a few minutes to become reachable.">
                <div className="flex items-center justify-between gap-3">
                    <code className="min-w-0 truncate font-mono text-[12px] text-foreground">{ssh}</code>
                    <Button size="sm" variant="ghost" onClick={() => copy('ssh', ssh)}>
                        <Icon name={copied === 'ssh' ? 'check' : 'content_copy'} size={14} />
                        {copied === 'ssh' ? 'Copied' : 'Copy'}
                    </Button>
                </div>
            </Panel>
            <div className="flex justify-end">
                <Link href={`/org/${orgSlug}/servers`} className={buttonClass('secondary')}>I&apos;ve saved the key, go to servers</Link>
            </div>
        </div>
    )
}

// ─── Form ─────────────────────────────────────────────────────────────────────

export default function NewServerForm({ orgSlug, orgName }: { orgSlug: string; orgName: string }) {
    const [options, setOptions] = useState<Options | null>(null)
    const [optionsError, setOptionsError] = useState<string | null>(null)
    const [reloadKey, setReloadKey] = useState(0)

    const [title, setTitle] = useState('')
    const [hostname, setHostname] = useState('')
    const [zone, setZone] = useState('')
    const [tier, setTier] = useState<PlanTier>('Starter')
    const [plan, setPlan] = useState('')
    const [osFamily, setOsFamily] = useState<OsFamily | null>(null)
    const [templateUuid, setTemplateUuid] = useState('')
    const [showAllZones, setShowAllZones] = useState(false)

    const [confirming, setConfirming] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<{ message: string; topUp?: boolean } | null>(null)
    const [created, setCreated] = useState<{ privateKey: string; hostname: string } | null>(null)

    useEffect(() => {
        const controller = new AbortController()
        const get = (path: string) =>
            fetch(path, { signal: controller.signal }).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${path} ${r.status}`))))
        Promise.all([get('/api/upcloud/zones'), get('/api/upcloud/plans'), get('/api/upcloud/templates'), get('/api/upcloud/plans/kes')])
            .then(([z, p, t, k]) => {
                const next: Options = { zones: z.zones ?? [], plans: p.plans ?? [], templates: t.templates ?? [], kesPrices: k.prices ?? {} }
                // Defaults are chosen once, from the data, rather than by effects reacting to it.
                const ubuntu = templatesByFamily(next.templates).ubuntu?.[0]
                setZone(defaultZone(next.zones))
                if (ubuntu) {
                    setOsFamily('ubuntu')
                    setTemplateUuid(ubuntu.uuid)
                }
                setOptions(next)
                setOptionsError(null)
            })
            .catch((e) => {
                if (e instanceof DOMException && e.name === 'AbortError') return
                setOptionsError('Server locations, plans or operating systems could not be loaded from the provider.')
            })
        return () => controller.abort()
    }, [reloadKey])

    const zones = useMemo(() => sortZones(options?.zones ?? []), [options])
    const recommended = zones.filter((z) => isRecommendedZone(z.id))
    const otherZones = zones.filter((z) => !isRecommendedZone(z.id))
    const groups = useMemo(() => templatesByFamily(options?.templates ?? []), [options])
    const plans = useMemo(() => plansInTier(options?.plans ?? [], tier, (name) => getPlanEurPrice(name) !== null), [options, tier])

    const selectedZone = zones.find((z) => z.id === zone)
    const selectedPlan = plans.find((p) => p.name === plan)
    const selectedTemplate = options?.templates.find((t) => t.uuid === templateUuid)
    const monthly = selectedPlan ? options?.kesPrices[selectedPlan.name] : undefined
    const hourlyKes = monthly ? centsToKes(hourlyRateCentsForMonthlyKes(monthly)) : undefined

    const hostnameInvalid = hostname.trim() !== '' && !isValidHostname(hostname.trim())
    const missing = !title.trim() ? 'a name' : !hostname.trim() ? 'a hostname' : !zone ? 'a location' : !selectedPlan ? 'a plan' : !templateUuid ? 'an operating system' : null
    const ready = !missing && !hostnameInvalid

    const create = async () => {
        if (!selectedPlan || submitting) return
        setSubmitting(true)
        setError(null)
        try {
            const res = await fetch(`/api/org/${orgSlug}/servers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: title.trim(), hostname: hostname.trim(), zone, plan, templateUuid, storageSize: selectedPlan.storage_size }),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) {
                setError({ message: data.error ?? 'The server could not be created. Try again.', topUp: data.code === 'INSUFFICIENT_CREDITS' })
                return
            }
            setCreated({ privateKey: data.privateKey, hostname: data.server.hostname })
        } catch {
            setError({ message: 'The server could not be created. Check your connection and try again.' })
        } finally {
            setSubmitting(false)
            setConfirming(false)
        }
    }

    if (created) return <KeyReveal orgSlug={orgSlug} privateKey={created.privateKey} hostname={created.hostname} />

    const header = (
        <PageHeader
            title="Create a server"
            description={`A Linux server for ${orgName}, billed hourly from the organization wallet.`}
            actions={<Link href={`/org/${orgSlug}/servers`} className={buttonClass('ghost')}>Cancel</Link>}
        />
    )

    if (optionsError) {
        return (
            <div className="space-y-6">
                {header}
                <Panel>
                    <LoadError title="Couldn't load server options" message={optionsError} onRetry={() => { setOptionsError(null); setReloadKey((k) => k + 1) }} />
                </Panel>
            </div>
        )
    }

    if (!options) {
        return (
            <div className="space-y-6">
                {header}
                <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
                    <div className="space-y-6">
                        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-44 w-full rounded-lg" />)}
                    </div>
                    <Skeleton className="h-64 w-full rounded-lg" />
                </div>
            </div>
        )
    }

    const createButton = (
        <Button
            variant="primary"
            onClick={() => (ready ? setConfirming(true) : setError({ message: `Choose ${missing ?? 'a valid hostname'} first.` }))}
            disabled={submitting}
            className="w-full"
        >
            {submitting ? <Spinner size={13} /> : <Icon name="add" size={15} />}
            {submitting ? 'Creating…' : 'Create server'}
        </Button>
    )

    return (
        <div className="space-y-6 pb-20 lg:pb-0">
            {header}

            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
                <div className="min-w-0 space-y-6">
                    <Panel title="Name" description="A title your team recognizes, and the hostname you will connect to.">
                        <FormGrid>
                            <Field label="Title" hint="Visible to members of this organization.">
                                <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Production API" autoComplete="off" maxLength={64} />
                            </Field>
                            <Field label="Hostname" error={hostnameInvalid ? 'Letters, digits, hyphens and dots only, like api.example.com.' : undefined} hint="For example api.example.com.">
                                <TextInput
                                    value={hostname}
                                    onChange={(e) => setHostname(e.target.value)}
                                    placeholder="api.example.com"
                                    invalid={hostnameInvalid}
                                    autoCapitalize="none"
                                    autoCorrect="off"
                                    spellCheck={false}
                                    className="font-mono"
                                />
                            </Field>
                        </FormGrid>
                    </Panel>

                    <Panel
                        title="Location"
                        description="Amsterdam is usually closest for users in Kenya, with Frankfurt and London close behind. Latency depends on your users' networks."
                    >
                        <div className="space-y-3">
                            <div className="grid gap-2 sm:grid-cols-3">
                                {recommended.map((z) => (
                                    <OptionCard key={z.id} selected={zone === z.id} onSelect={() => setZone(z.id)}>
                                        <span className="flex items-center gap-2">
                                            <Flag zoneId={z.id} className="h-3.5 w-5" />
                                            <span className="text-[13px] font-medium text-foreground">{ZONE_META[z.id]?.city ?? z.description}</span>
                                        </span>
                                        <span className="mt-1.5 block text-[12px] text-muted-foreground">
                                            {z.id === DEFAULT_ZONE ? 'Recommended' : ZONE_META[z.id]?.country ?? z.id}
                                        </span>
                                    </OptionCard>
                                ))}
                            </div>
                            {otherZones.length > 0 && (
                                <>
                                    <Button size="sm" variant="ghost" onClick={() => setShowAllZones((v) => !v)} aria-expanded={showAllZones}>
                                        <Icon name={showAllZones ? 'expand_less' : 'expand_more'} size={16} />
                                        {showAllZones ? 'Fewer locations' : `${otherZones.length} more locations`}
                                    </Button>
                                    {showAllZones && (
                                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                            {otherZones.map((z) => (
                                                <OptionCard key={z.id} selected={zone === z.id} onSelect={() => setZone(z.id)} className="py-2.5">
                                                    <span className="flex items-center gap-2 pr-5">
                                                        <Flag zoneId={z.id} className="h-3 w-4" />
                                                        <span className="truncate text-[13px] text-foreground">{zoneLabel(z)}</span>
                                                        {GREEN_ZONES.has(z.id) && <Icon name="eco" size={13} className="shrink-0 text-emerald-600 dark:text-emerald-400" />}
                                                    </span>
                                                </OptionCard>
                                            ))}
                                        </div>
                                    )}
                                    {showAllZones && (
                                        <p className="flex items-center gap-1 text-[12px] text-muted-foreground">
                                            <Icon name="eco" size={13} className="text-emerald-600 dark:text-emerald-400" />
                                            Runs on renewable energy.
                                        </p>
                                    )}
                                </>
                            )}
                        </div>
                    </Panel>

                    <Panel title="Plan" description="Storage is included. Prices are monthly estimates; you are charged by the hour.">
                        <div className="space-y-4">
                            <Tabs
                                label="Plan tier"
                                value={tier}
                                onChange={(id) => { setTier(id as PlanTier); setPlan('') }}
                                items={TIERS.map((t) => ({ id: t.id, label: `${t.label} · from ${formatKes(options.kesPrices[t.from])}` }))}
                            />
                            <p className="text-[12px] text-muted-foreground">{TIERS.find((t) => t.id === tier)?.description}</p>
                            {plans.length === 0 ? (
                                <p className="rounded-md border border-dashed border-border px-4 py-6 text-center text-[13px] text-muted-foreground">No plans are available in this tier right now.</p>
                            ) : (
                                <div className="grid gap-2 sm:grid-cols-2">
                                    {plans.map((p) => (
                                        <OptionCard key={p.name} selected={plan === p.name} onSelect={() => setPlan(p.name)}>
                                            <span className="block pr-6 text-[13px] font-medium text-foreground">
                                                {p.core_number} vCPU · {formatMemory(p.memory_amount)} · {p.storage_size} GB
                                            </span>
                                            <span className="mt-0.5 block text-[12px] text-muted-foreground">{planUseCase(p)}</span>
                                            <span className="mt-2 block text-[13px] font-semibold tabular-nums text-foreground">
                                                {formatKes(options.kesPrices[p.name])}
                                                <span className="ml-1 text-[12px] font-normal text-muted-foreground">/ month</span>
                                            </span>
                                        </OptionCard>
                                    ))}
                                </div>
                            )}
                        </div>
                    </Panel>

                    <Panel title="Operating system" description="Ubuntu LTS suits most websites, APIs and apps.">
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                {OS_FAMILIES.filter((f) => groups[f.key]?.length).map((f) => (
                                    <OptionCard
                                        key={f.key}
                                        selected={osFamily === f.key}
                                        onSelect={() => {
                                            setOsFamily(f.key)
                                            const first = groups[f.key]?.[0]
                                            if (first) setTemplateUuid(first.uuid)
                                        }}
                                    >
                                        <span className="flex items-center gap-2.5">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={f.icon} alt="" className="h-6 w-6 object-contain" />
                                            <span>
                                                <span className="block text-[13px] font-medium text-foreground">{f.label}</span>
                                                {f.recommended && <span className="block text-[11px] text-muted-foreground">Recommended</span>}
                                            </span>
                                        </span>
                                    </OptionCard>
                                ))}
                            </div>
                            {osFamily && (groups[osFamily]?.length ?? 0) > 1 && (
                                <Field label="Version" className="max-w-sm">
                                    <Select value={templateUuid} onChange={(e) => setTemplateUuid(e.target.value)}>
                                        {groups[osFamily]!.map((t) => <option key={t.uuid} value={t.uuid}>{t.title}</option>)}
                                    </Select>
                                </Field>
                            )}
                            <p className="flex items-start gap-1.5 text-[12px] text-muted-foreground">
                                <Icon name="key" size={14} className="mt-px shrink-0" />
                                An SSH key is generated for you. You download its private half once, right after the server is created.
                            </p>
                        </div>
                    </Panel>
                </div>

                <aside className="space-y-4 lg:sticky lg:top-6">
                    <Panel title="Summary" footer={<div className="w-full">{createButton}</div>}>
                        <div className="divide-y divide-border">
                            <SummaryRow label="Name" value={title.trim() || '—'} />
                            <SummaryRow label="Hostname" value={hostname.trim() || '—'} />
                            <SummaryRow label="Location" value={zoneLabel(selectedZone)} />
                            <SummaryRow label="Plan" value={selectedPlan ? `${selectedPlan.core_number} vCPU · ${formatMemory(selectedPlan.memory_amount)}` : '—'} />
                            <SummaryRow label="Storage" value={selectedPlan ? `${selectedPlan.storage_size} GB` : '—'} />
                            <SummaryRow label="System" value={selectedTemplate?.title ?? '—'} />
                        </div>
                        <div className="mt-3 rounded-md bg-muted/50 p-3">
                            <p className="flex items-baseline justify-between text-[13px]">
                                <span className="text-muted-foreground">About</span>
                                <span className="text-lg font-semibold tabular-nums text-foreground">{formatKes(monthly)}<span className="ml-1 text-[12px] font-normal text-muted-foreground">/ month</span></span>
                            </p>
                            <p className="mt-1 text-[12px] text-muted-foreground">
                                {hourlyKes !== undefined ? `Charged KSh ${hourlyKes.toFixed(2)} an hour from the wallet, starting with the first hour.` : 'Charged hourly from the organization wallet.'}
                            </p>
                        </div>
                    </Panel>
                    {error && (
                        <Notice tone="error">
                            {error.message}
                            {error.topUp && <> <Link href={`/org/${orgSlug}/billing`} className="underline underline-offset-2">Top up the wallet</Link>.</>}
                        </Notice>
                    )}
                </aside>
            </div>

            {/* On small screens the summary is far down; keep the price and the button in reach. */}
            <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
                <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <p className="truncate text-[12px] text-muted-foreground">{selectedPlan ? `${selectedPlan.core_number} vCPU · ${formatMemory(selectedPlan.memory_amount)} · ${zoneLabel(selectedZone)}` : 'Choose a plan'}</p>
                        <p className="text-[15px] font-semibold tabular-nums text-foreground">{formatKes(monthly)}<span className="ml-1 text-[12px] font-normal text-muted-foreground">/ month</span></p>
                    </div>
                    <div className="w-36 shrink-0">{createButton}</div>
                </div>
            </div>

            <ConfirmDialog
                open={confirming}
                title={`Create ${title.trim() || 'this server'}?`}
                description={
                    hourlyKes !== undefined
                        ? `The first hour (KSh ${hourlyKes.toFixed(2)}) is charged from the ${orgName} wallet now, then KSh ${hourlyKes.toFixed(2)} every hour until you delete the server.`
                        : `It is charged hourly from the ${orgName} wallet until you delete it.`
                }
                confirmLabel="Create server"
                tone="primary"
                busy={submitting}
                onConfirm={create}
                onCancel={() => setConfirming(false)}
            />
        </div>
    )
}
