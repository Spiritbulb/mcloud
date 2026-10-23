'use client'

import { useEffect, useState } from 'react'
import { planAllowsRequired, type Plan } from '@mcloud/merchant/plans'
import { Badge } from '@mcloud/ui/kit/badge'
import { Button } from '@mcloud/ui/kit/button'
import { Field, FormGrid, Switch, TextInput } from '@mcloud/ui/kit/form'
import { Icon } from '@mcloud/ui/kit/icon'
import { LoadError } from '@mcloud/ui/kit/load-error'
import { Notice } from '@mcloud/ui/kit/notice'
import { Panel } from '@mcloud/ui/kit/panel'
import { SaveStatus } from '@mcloud/ui/kit/save-bar'
import { Spinner } from '@mcloud/ui/kit/skeleton'
import { cn } from '@mcloud/ui/utils'
import { ProGateInline } from '../pro'

interface PaymentSettingsProps {
    storeId: string
    slug: string
    plan: Plan
}

type Manual = { enabled: boolean; type: 'till' | 'paybill'; number: string; account: string }
type Stored = { consumerKey: boolean; consumerSecret: boolean; passkey: boolean }

const STEPS = ['API keys', 'Shortcode and passkey', 'Test and turn on']

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
    return (
        <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-foreground underline underline-offset-2">
            {children}
            <Icon name="open_in_new" size={12} />
        </a>
    )
}

export default function PaymentSettings({ slug, plan }: PaymentSettingsProps) {
    const [loading, setLoading] = useState(true)
    // A failed load must not fall through to the empty form: it would read as "nothing set up"
    // and a save from there would overwrite the real settings.
    const [loadFailed, setLoadFailed] = useState(false)
    const [reloadKey, setReloadKey] = useState(0)
    const [saving, setSaving] = useState<'manual' | 'daraja' | null>(null)
    const [justSaved, setJustSaved] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [manual, setManual] = useState<Manual>({ enabled: false, type: 'till', number: '', account: '' })
    const [savedManual, setSavedManual] = useState(manual)

    // Daraja M-PESA STK Push. Secrets are never sent back; `stored` says which ones are saved.
    const [darajaEnabled, setDarajaEnabled] = useState(false)
    const [stored, setStored] = useState<Stored>({ consumerKey: false, consumerSecret: false, passkey: false })
    const [setupOpen, setSetupOpen] = useState(false)
    const [step, setStep] = useState(0)
    const [consumerKey, setConsumerKey] = useState('')
    const [consumerSecret, setConsumerSecret] = useState('')
    const [passkey, setPasskey] = useState('')
    const [shortcode, setShortcode] = useState('')
    const [enableDraft, setEnableDraft] = useState(false)
    const [test, setTest] = useState<{ state: 'idle' | 'testing' | 'ok' | 'fail'; error?: string }>({ state: 'idle' })

    const darajaAllowed = planAllowsRequired(plan, 'hobby')

    useEffect(() => {
        let cancelled = false
        fetch(`/api/store/${slug}/integrations`, { credentials: 'include' })
            .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`integrations ${res.status}`))))
            .then(({ mpesa }) => {
                if (cancelled) return
                const next: Manual = {
                    enabled: mpesa?.enabled ?? false,
                    type: mpesa?.mpesa_type === 'paybill' ? 'paybill' : 'till',
                    number: mpesa?.mpesa_till ?? mpesa?.mpesa_paybill ?? '',
                    account: mpesa?.mpesa_account ?? '',
                }
                setManual(next)
                setSavedManual(next)
                setDarajaEnabled(mpesa?.darajaEnabled ?? false)
                setShortcode(mpesa?.shortcode ?? '')
                setStored({ consumerKey: !!mpesa?.hasConsumerKey, consumerSecret: !!mpesa?.hasConsumerSecret, passkey: !!mpesa?.hasPasskey })
                setLoadFailed(false)
            })
            .catch((err) => {
                console.error(err)
                if (!cancelled) setLoadFailed(true)
            })
            .finally(() => {
                if (!cancelled) setLoading(false)
            })
        return () => {
            cancelled = true
        }
    }, [slug, reloadKey])

    const save = async (which: 'manual' | 'daraja', daraja: { enabled: boolean; withSecrets: boolean }) => {
        setSaving(which)
        setError(null)
        try {
            const res = await fetch(`/api/store/${slug}/integrations`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider: 'mpesa',
                    data: {
                        enabled: savedManual.enabled,
                        ...(which === 'manual' && {
                            enabled: manual.enabled,
                            mpesa_type: manual.type,
                            ...(manual.type === 'till'
                                ? { mpesa_till: manual.number.trim() }
                                : { mpesa_paybill: manual.number.trim(), mpesa_account: manual.account.trim() }),
                        }),
                        darajaEnabled: daraja.enabled,
                        ...(daraja.withSecrets && {
                            ...(consumerKey.trim() && { consumerKey: consumerKey.trim() }),
                            ...(consumerSecret.trim() && { consumerSecret: consumerSecret.trim() }),
                            ...(passkey.trim() && { passkey: passkey.trim() }),
                            ...(shortcode.trim() && { shortcode: shortcode.trim() }),
                        }),
                    },
                }),
            })
            if (!res.ok) {
                const body = await res.json().catch(() => null)
                throw new Error(typeof body?.error === 'string' ? body.error : 'Could not save. Try again.')
            }
            if (which === 'manual') {
                const clean = { ...manual, number: manual.number.trim(), account: manual.account.trim() }
                setManual(clean)
                setSavedManual(clean)
            }
            setDarajaEnabled(daraja.enabled)
            if (daraja.withSecrets) {
                setStored((s) => ({
                    consumerKey: s.consumerKey || !!consumerKey.trim(),
                    consumerSecret: s.consumerSecret || !!consumerSecret.trim(),
                    passkey: s.passkey || !!passkey.trim(),
                }))
                setConsumerKey('')
                setConsumerSecret('')
                setPasskey('')
            }
            setJustSaved(true)
            setTimeout(() => setJustSaved(false), 2500)
            return true
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not save. Try again.')
            return false
        } finally {
            setSaving(null)
        }
    }

    const testConnection = async () => {
        setTest({ state: 'testing' })
        try {
            const res = await fetch(`/api/store/${slug}/payments/mpesa/test-credentials`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ consumerKey: consumerKey.trim(), consumerSecret: consumerSecret.trim() }),
            })
            const data = await res.json().catch(() => ({}))
            setTest(data.success ? { state: 'ok' } : { state: 'fail', error: data.error || 'Connection failed.' })
        } catch {
            setTest({ state: 'fail', error: 'Network error. Check your connection and try again.' })
        }
    }

    const openSetup = () => {
        setStep(0)
        setEnableDraft(darajaEnabled || !stored.consumerKey)
        setTest({ state: 'idle' })
        setSetupOpen(true)
    }

    if (loading) {
        return (
            <div role="status" className="flex items-center justify-center gap-2 py-10 text-[13px] text-muted-foreground">
                <Spinner />
                Loading payment settings…
            </div>
        )
    }

    if (loadFailed) {
        return (
            <Panel>
                <LoadError
                    title="Couldn't load your payment settings"
                    message="Nothing was changed. Try again in a moment."
                    onRetry={() => {
                        setLoading(true)
                        setReloadKey((k) => k + 1)
                    }}
                />
            </Panel>
        )
    }

    const manualDirty =
        manual.enabled !== savedManual.enabled ||
        manual.type !== savedManual.type ||
        manual.number.trim() !== savedManual.number ||
        (manual.type === 'paybill' && manual.account.trim() !== savedManual.account)
    const manualInvalid = manual.enabled && !manual.number.trim()

    const hasKeys = (stored.consumerKey || !!consumerKey.trim()) && (stored.consumerSecret || !!consumerSecret.trim())
    const hasPasskey = stored.passkey || !!passkey.trim()
    const canContinue = step === 0 ? hasKeys : step === 1 ? hasPasskey && !!shortcode.trim() : true
    const savedHint = (has: boolean) => (has ? 'Saved. Leave blank to keep it.' : undefined)

    return (
        <div className="space-y-6">
            {error && <Notice tone="error">{error}</Notice>}

            <Panel
                title="Manual M-PESA"
                description="Customers pay to your till or paybill, and you confirm each payment yourself."
                action={<Switch checked={manual.enabled} onChange={(enabled) => setManual((m) => ({ ...m, enabled }))} />}
                footer={
                    <Button variant="primary" onClick={() => save('manual', { enabled: darajaEnabled, withSecrets: false })} disabled={!manualDirty || manualInvalid || saving !== null}>
                        {saving === 'manual' && <Spinner size={13} />}
                        {saving === 'manual' ? 'Saving…' : 'Save'}
                    </Button>
                }
            >
                {manual.enabled ? (
                    <div className="space-y-4">
                        <div role="radiogroup" aria-label="Payment type" className="inline-flex rounded-md border border-border p-0.5">
                            {(['till', 'paybill'] as const).map((t) => (
                                <button
                                    key={t}
                                    type="button"
                                    role="radio"
                                    aria-checked={manual.type === t}
                                    onClick={() => setManual((m) => ({ ...m, type: t }))}
                                    className={cn(
                                        'h-7 rounded px-3 text-[12px] transition-colors',
                                        manual.type === t ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground hover:text-foreground',
                                    )}
                                >
                                    {t === 'till' ? 'Till number' : 'Paybill'}
                                </button>
                            ))}
                        </div>
                        <FormGrid>
                            <Field label={manual.type === 'till' ? 'Till number' : 'Paybill number'}>
                                <TextInput
                                    value={manual.number}
                                    onChange={(e) => setManual((m) => ({ ...m, number: e.target.value }))}
                                    placeholder={manual.type === 'till' ? '4202518' : '123456'}
                                    inputMode="numeric"
                                    className="font-mono"
                                    invalid={manualInvalid}
                                />
                            </Field>
                            {manual.type === 'paybill' && (
                                <Field label="Account number" hint="What customers enter as the account.">
                                    <TextInput
                                        value={manual.account}
                                        onChange={(e) => setManual((m) => ({ ...m, account: e.target.value }))}
                                        placeholder="e.g. your shop name"
                                    />
                                </Field>
                            )}
                        </FormGrid>
                    </div>
                ) : (
                    <p className="text-[13px] text-muted-foreground">Off. Turn it on to show your till or paybill at checkout.</p>
                )}
            </Panel>

            <Panel
                title="M-PESA STK Push (Daraja)"
                description="Customers get a payment prompt on their phone, and orders are confirmed automatically."
                action={darajaAllowed ? <Badge tone={darajaEnabled ? 'success' : 'neutral'}>{darajaEnabled ? 'On' : stored.consumerKey ? 'Off' : 'Not set up'}</Badge> : undefined}
                footer={
                    darajaAllowed && !setupOpen ? (
                        <Button onClick={openSetup}>
                            <Icon name={stored.consumerKey ? 'edit' : 'settings'} size={14} />
                            {stored.consumerKey ? 'Edit' : 'Set up'}
                        </Button>
                    ) : undefined
                }
            >
                {!darajaAllowed ? (
                    <ProGateInline plan={plan} requires="hobby" feature="Automatic M-PESA payments" description="STK Push is on the Hobby plan and higher." />
                ) : !setupOpen ? (
                    <p className="text-[13px] text-muted-foreground">
                        {stored.consumerKey
                            ? `Using shortcode ${shortcode || 'not set'}. ${darajaEnabled ? 'Shown at checkout.' : 'Not shown at checkout.'}`
                            : 'Connect your Safaricom Daraja app to send payment prompts.'}
                    </p>
                ) : (
                    <div className="space-y-5">
                        <ol className="flex gap-1.5" aria-label="Setup steps">
                            {STEPS.map((label, i) => (
                                <li key={label} className="flex-1 space-y-1" aria-current={i === step ? 'step' : undefined}>
                                    <div className={cn('h-1 rounded-full', i <= step ? 'bg-primary' : 'bg-muted')} />
                                    <p className={cn('text-[11px]', i === step ? 'font-medium text-foreground' : 'text-muted-foreground')}>{label}</p>
                                </li>
                            ))}
                        </ol>

                        {step === 0 && (
                            <div className="space-y-4">
                                <Notice>
                                    In <ExternalLink href="https://developer.safaricom.co.ke/MyApps">Daraja, My Apps</ExternalLink>, open your app and copy the Consumer Key and Consumer Secret.
                                </Notice>
                                <FormGrid>
                                    <Field label="Consumer Key" hint={savedHint(stored.consumerKey)}>
                                        <TextInput type="password" value={consumerKey} onChange={(e) => setConsumerKey(e.target.value)} placeholder={stored.consumerKey ? '••••••••' : 'Paste your Consumer Key'} autoComplete="off" />
                                    </Field>
                                    <Field label="Consumer Secret" hint={savedHint(stored.consumerSecret)}>
                                        <TextInput type="password" value={consumerSecret} onChange={(e) => setConsumerSecret(e.target.value)} placeholder={stored.consumerSecret ? '••••••••' : 'Paste your Consumer Secret'} autoComplete="off" />
                                    </Field>
                                </FormGrid>
                            </div>
                        )}

                        {step === 1 && (
                            <div className="space-y-4">
                                <Notice>
                                    The shortcode is the till or paybill number registered on Daraja. Safaricom gives you the passkey when STK Push is set up; see <ExternalLink href="https://developer.safaricom.co.ke/docs#lipa-na-m-pesa-online">their docs</ExternalLink>.
                                </Notice>
                                <FormGrid>
                                    <Field label="Business shortcode">
                                        <TextInput value={shortcode} onChange={(e) => setShortcode(e.target.value)} placeholder="e.g. 174379" inputMode="numeric" className="font-mono" />
                                    </Field>
                                    <Field label="Passkey" hint={savedHint(stored.passkey)}>
                                        <TextInput type="password" value={passkey} onChange={(e) => setPasskey(e.target.value)} placeholder={stored.passkey ? '••••••••' : 'Paste your STK Push passkey'} autoComplete="off" />
                                    </Field>
                                </FormGrid>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-4">
                                <div className="flex flex-wrap items-center gap-3">
                                    <Button onClick={testConnection} disabled={test.state === 'testing'}>
                                        {test.state === 'testing' ? <Spinner size={13} /> : <Icon name="network_check" size={14} />}
                                        {test.state === 'testing' ? 'Testing…' : 'Test the keys'}
                                    </Button>
                                    {test.state === 'ok' && <Badge tone="success">Safaricom accepted them</Badge>}
                                    <span className="text-[12px] text-muted-foreground">No payment is made.</span>
                                </div>
                                {test.state === 'fail' && test.error && <Notice tone="error">{test.error}</Notice>}
                                <Switch
                                    checked={enableDraft}
                                    onChange={setEnableDraft}
                                    label="Show STK Push at checkout"
                                    description="Turn this off to keep your keys saved without offering it."
                                />
                            </div>
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
                            <Button variant="ghost" onClick={() => setSetupOpen(false)} disabled={saving !== null}>Cancel</Button>
                            <div className="flex items-center gap-2">
                                {step > 0 && <Button onClick={() => setStep((s) => s - 1)} disabled={saving !== null}>Back</Button>}
                                {step < 2 ? (
                                    <Button variant="primary" onClick={() => setStep((s) => s + 1)} disabled={!canContinue}>
                                        Continue
                                        <Icon name="chevron_right" size={14} />
                                    </Button>
                                ) : (
                                    <Button
                                        variant="primary"
                                        disabled={saving !== null}
                                        onClick={async () => {
                                            if (await save('daraja', { enabled: enableDraft, withSecrets: true })) setSetupOpen(false)
                                        }}
                                    >
                                        {saving === 'daraja' && <Spinner size={13} />}
                                        {saving === 'daraja' ? 'Saving…' : 'Save'}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </Panel>

            <SaveStatus saving={saving !== null} saved={justSaved} />
        </div>
    )
}
