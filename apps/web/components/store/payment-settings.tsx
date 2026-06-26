'use client'

import { useEffect, useState } from 'react'
import { Button } from '@mcloud/ui/button'
import { Input } from '@mcloud/ui/input'
import { Label } from '@mcloud/ui/label'
import { Badge } from '@mcloud/ui/badge'
import { Separator } from '@mcloud/ui/separator'
import { Switch } from '@mcloud/ui/switch'
import { Check, ExternalLink, Phone, Loader2, X, ChevronRight, AlertCircle, CheckCircle2 } from 'lucide-react'

interface IntegrationData {
    enabled?: boolean
    [key: string]: any
}

interface PaymentSettingsProps {
    storeId: string
    slug: string
}

export default function PaymentSettings({ storeId, slug }: PaymentSettingsProps) {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState<string | null>(null)
    const [saved, setSaved] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    const [mpesaEnabled, setMpesaEnabled] = useState(false)
    const [mpesaType, setMpesaType] = useState<'paybill' | 'till'>('till')
    const [mpesaNumber, setMpesaNumber] = useState('')
    const [mpesaAccount, setMpesaAccount] = useState('')

    // Daraja M-PESA STK Push
    const [darajaEnabled, setDarajaEnabled] = useState(false)
    const [darajaSheetOpen, setDarajaSheetOpen] = useState(false)
    const [darajaStep, setDarajaStep] = useState(0)
    const [mpesaConsumerKey, setMpesaConsumerKey] = useState('')
    const [mpesaConsumerSecret, setMpesaConsumerSecret] = useState('')
    const [mpesaPasskey, setMpesaPasskey] = useState('')
    const [mpesaShortcode, setMpesaShortcode] = useState('')
    const [darajaTestStatus, setDarajaTestStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle')
    const [darajaTestError, setDarajaTestError] = useState('')


    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/store/${slug}/integrations`, {
                    credentials: 'include',
                })
                if (res.ok) {
                    const data = await res.json()
                    const { mpesa } = data

                    if (mpesa) {
                        setMpesaEnabled(mpesa.enabled ?? false)
                        setMpesaType(mpesa.mpesa_type ?? 'till')
                        setMpesaNumber(mpesa.mpesa_till ?? mpesa.mpesa_paybill ?? '')
                        setMpesaAccount(mpesa.mpesa_account ?? '')
                        setDarajaEnabled(mpesa.darajaEnabled ?? false)
                        setMpesaShortcode(mpesa.shortcode ?? '')
                    }
                }
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [slug])

    const handleSave = async (provider: string, data: any) => {
        setSaving(provider)
        setError(null)
        setSaved(null)
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/store/${slug}/integrations`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider, data })
            })
            if (!res.ok) {
                throw new Error('Failed to save')
            }
            setSaved(provider)
            setTimeout(() => setSaved(null), 2500)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setSaving(null)
        }
    }

    const saveMpesa = () => {
        handleSave('mpesa', {
            enabled: mpesaEnabled,
            darajaEnabled: darajaEnabled,
            mpesa_type: mpesaType,
            ...(mpesaType === 'till' ? { mpesa_till: mpesaNumber } : { mpesa_paybill: mpesaNumber, mpesa_account: mpesaAccount }),
            ...(mpesaConsumerKey && { consumerKey: mpesaConsumerKey }),
            ...(mpesaConsumerSecret && { consumerSecret: mpesaConsumerSecret }),
            ...(mpesaPasskey && { passkey: mpesaPasskey }),
            ...(mpesaShortcode && { shortcode: mpesaShortcode }),
        })
    }

    const testDarajaConnection = async () => {
        if (!mpesaConsumerKey || !mpesaConsumerSecret) {
            setDarajaTestError('Enter Consumer Key and Secret first')
            setDarajaTestStatus('fail')
            return
        }
        setDarajaTestStatus('testing')
        setDarajaTestError('')
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/payments/mpesa/test-credentials`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ consumerKey: mpesaConsumerKey, consumerSecret: mpesaConsumerSecret }),
            })
            const data = await res.json()
            if (data.success) {
                setDarajaTestStatus('ok')
            } else {
                setDarajaTestStatus('fail')
                setDarajaTestError(data.error || 'Connection failed')
            }
        } catch {
            setDarajaTestStatus('fail')
            setDarajaTestError('Network error — check your credentials and try again')
        }
    }

    if (loading) {
        return <div className="py-8 flex justify-center"><Loader2 className="animate-spin text-muted-foreground" /></div>
    }

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-lg font-semibold text-foreground">Payment Integrations</h2>
                <p className="text-sm text-muted-foreground mt-0.5">Configure how customers pay in your store</p>
                {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
            </div>

            {/* M-PESA */}
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-md bg-green-600 flex items-center justify-center shrink-0">
                        <Phone className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">Manual M-PESA</p>
                        <p className="text-xs text-muted-foreground">Receive payments via Safaricom M-PESA (manual verification)</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant={mpesaEnabled ? 'default' : 'secondary'} className="text-[10px]">
                            {mpesaEnabled ? 'Active' : 'Not configured'}
                        </Badge>
                        <Switch checked={mpesaEnabled} onCheckedChange={setMpesaEnabled} />
                    </div>
                </div>

                {mpesaEnabled && (
                    <div className="space-y-4 max-w-sm pl-12">
                        <div className="space-y-1.5">
                            <Label className="text-sm">Payment type</Label>
                            <div className="flex rounded-md border overflow-hidden">
                                {(['till', 'paybill'] as const).map((t) => (
                                    <button
                                        key={t}
                                        onClick={() => setMpesaType(t)}
                                        className={`flex-1 h-9 text-xs transition-colors ${mpesaType === t
                                            ? 'bg-[#425e7b] text-white font-medium'
                                            : 'text-muted-foreground hover:text-white hover:bg-[#425e7b]/60 cursor-pointer'
                                            }`}
                                    >
                                        {t === 'till' ? 'Till Number' : 'Paybill'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label>{mpesaType === 'till' ? 'Till Number' : 'Paybill Number'}</Label>
                            <Input
                                value={mpesaNumber}
                                onChange={(e) => setMpesaNumber(e.target.value)}
                                placeholder={mpesaType === 'till' ? '4202518' : '123456'}
                                className="font-mono"
                            />
                        </div>

                        {mpesaType === 'paybill' && (
                            <div className="space-y-1.5">
                                <Label>Account Number</Label>
                                <Input
                                    value={mpesaAccount}
                                    onChange={(e) => setMpesaAccount(e.target.value)}
                                    placeholder="e.g. Account Name"
                                />
                            </div>
                        )}
                        <Button onClick={saveMpesa} disabled={saving === 'mpesa'} className="w-full h-9 text-sm cursor-pointer bg-[#425e7b] hover:bg-[#425e7b]/60 text-white">
                            {saving === 'mpesa' ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : saved === 'mpesa' ? <Check className="w-3.5 h-3.5 mr-1.5" /> : 'Save Manual M-PESA settings'}
                        </Button>
                    </div>
                )}
            </div>

            <Separator />

            {/* Daraja M-PESA STK Push */}
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-md bg-green-700 flex items-center justify-center shrink-0">
                        <Phone className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">M-PESA STK Push (Daraja)</p>
                        <p className="text-xs text-muted-foreground">Automated payment prompts via Safaricom Daraja API</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant={darajaEnabled ? 'default' : 'secondary'} className="text-[10px]">
                            {darajaEnabled ? 'Active' : 'Not configured'}
                        </Badge>
                        <button
                            onClick={() => { setDarajaSheetOpen(true); setDarajaStep(0) }}
                            className="h-7 px-3 rounded-full border border-border text-[12px] text-muted-foreground hover:bg-muted transition-colors"
                        >
                            {darajaEnabled ? 'Edit' : 'Configure'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Daraja guided setup sheet */}
            {darajaSheetOpen && (
                <div className="fixed inset-0 z-50 flex">
                    {/* Backdrop */}
                    <div className="flex-1 bg-black/40" onClick={() => setDarajaSheetOpen(false)} />
                    {/* Sheet */}
                    <div className="w-full max-w-md bg-background flex flex-col shadow-2xl overflow-y-auto">
                        {/* Header */}
                        <div className="flex items-center gap-3 px-6 py-5 border-b border-border shrink-0">
                            <div className="w-10 h-10 rounded-xl bg-green-700 flex items-center justify-center shrink-0">
                                <Phone className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-foreground">Set up Daraja STK Push</p>
                                <p className="text-xs text-muted-foreground">Step {darajaStep + 1} of 3</p>
                            </div>
                            <button onClick={() => setDarajaSheetOpen(false)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                                <X className="w-4 h-4 text-muted-foreground" />
                            </button>
                        </div>

                        {/* Step indicator */}
                        <div className="flex gap-1.5 px-6 pt-4 shrink-0">
                            {['API Credentials', 'Shortcode & Passkey', 'Test & Enable'].map((label, i) => (
                                <div key={i} className="flex-1 space-y-1">
                                    <div className={`h-1 rounded-full transition-colors ${i <= darajaStep ? 'bg-green-600' : 'bg-muted'}`} />
                                    <p className={`text-[10px] ${i === darajaStep ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>{label}</p>
                                </div>
                            ))}
                        </div>

                        {/* Step content */}
                        <div className="flex-1 px-6 py-6 space-y-5">
                            {darajaStep === 0 && (
                                <>
                                    <div className="rounded-xl bg-muted/50 p-4 text-xs space-y-2 text-muted-foreground leading-relaxed">
                                        <p className="font-medium text-foreground">Where to find these</p>
                                        <p>Go to <a href="https://developer.safaricom.co.ke/MyApps" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 text-foreground inline-flex items-center gap-0.5">developer.safaricom.co.ke/MyApps <ExternalLink className="w-3 h-3" /></a>, open your app, and copy the Consumer Key and Consumer Secret from the Keys tab.</p>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Consumer Key</Label>
                                        <Input
                                            type="password"
                                            value={mpesaConsumerKey}
                                            onChange={(e) => setMpesaConsumerKey(e.target.value)}
                                            placeholder="Paste your Consumer Key"
                                            autoComplete="off"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Consumer Secret</Label>
                                        <Input
                                            type="password"
                                            value={mpesaConsumerSecret}
                                            onChange={(e) => setMpesaConsumerSecret(e.target.value)}
                                            placeholder="Paste your Consumer Secret"
                                            autoComplete="off"
                                        />
                                    </div>
                                </>
                            )}

                            {darajaStep === 1 && (
                                <>
                                    <div className="rounded-xl bg-muted/50 p-4 text-xs space-y-2 text-muted-foreground leading-relaxed">
                                        <p className="font-medium text-foreground">Finding your Shortcode & Passkey</p>
                                        <p>Your <strong className="text-foreground">Business Shortcode</strong> is your Till or Paybill number registered on Daraja.</p>
                                        <p>Your <strong className="text-foreground">Passkey</strong> is provided by Safaricom when you set up STK Push — check your Daraja app's STK Push section or <a href="https://developer.safaricom.co.ke/docs#lipa-na-m-pesa-online" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 text-foreground inline-flex items-center gap-0.5">the docs <ExternalLink className="w-3 h-3" /></a>.</p>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Business Shortcode</Label>
                                        <Input
                                            value={mpesaShortcode}
                                            onChange={(e) => setMpesaShortcode(e.target.value)}
                                            placeholder="e.g. 174379"
                                            inputMode="numeric"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Passkey</Label>
                                        <Input
                                            type="password"
                                            value={mpesaPasskey}
                                            onChange={(e) => setMpesaPasskey(e.target.value)}
                                            placeholder="Paste your STK Push passkey"
                                            autoComplete="off"
                                        />
                                    </div>
                                </>
                            )}

                            {darajaStep === 2 && (
                                <>
                                    <div className="rounded-xl bg-muted/50 p-4 text-xs text-muted-foreground leading-relaxed">
                                        <p>Test that your credentials connect to Safaricom's sandbox before going live. No real payment is made.</p>
                                    </div>

                                    <button
                                        onClick={testDarajaConnection}
                                        disabled={darajaTestStatus === 'testing'}
                                        className="w-full h-9 rounded-lg border border-border text-sm text-foreground hover:bg-muted transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {darajaTestStatus === 'testing' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                        {darajaTestStatus === 'ok' && <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />}
                                        {darajaTestStatus === 'fail' && <AlertCircle className="w-3.5 h-3.5 text-destructive" />}
                                        {darajaTestStatus === 'idle' ? 'Test connection' :
                                            darajaTestStatus === 'testing' ? 'Testing…' :
                                            darajaTestStatus === 'ok' ? 'Connected successfully' : 'Test failed — try again'}
                                    </button>

                                    {darajaTestStatus === 'fail' && darajaTestError && (
                                        <p className="text-xs text-destructive">{darajaTestError}</p>
                                    )}

                                    <div className="flex items-center gap-3 pt-2">
                                        <Switch
                                            checked={darajaEnabled}
                                            onCheckedChange={setDarajaEnabled}
                                            id="daraja-enable"
                                        />
                                        <Label htmlFor="daraja-enable" className="text-sm cursor-pointer">
                                            Enable Daraja STK Push at checkout
                                        </Label>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-border flex gap-3 shrink-0">
                            {darajaStep > 0 && (
                                <button
                                    onClick={() => setDarajaStep(s => s - 1)}
                                    className="flex-1 h-9 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted transition-colors"
                                >
                                    Back
                                </button>
                            )}
                            {darajaStep < 2 ? (
                                <button
                                    onClick={() => setDarajaStep(s => s + 1)}
                                    disabled={
                                        (darajaStep === 0 && (!mpesaConsumerKey || !mpesaConsumerSecret)) ||
                                        (darajaStep === 1 && (!mpesaShortcode || !mpesaPasskey))
                                    }
                                    className="flex-1 h-9 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 disabled:opacity-40"
                                >
                                    Continue <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                            ) : (
                                <button
                                    onClick={() => { saveMpesa(); setDarajaSheetOpen(false) }}
                                    disabled={saving === 'mpesa'}
                                    className="flex-1 h-9 rounded-lg bg-green-700 text-white text-sm font-medium hover:bg-green-800 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                                >
                                    {saving === 'mpesa' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved === 'mpesa' ? <><Check className="w-3.5 h-3.5" /> Saved</> : 'Save & finish'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}


        </div>
    )
}