'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Check, ExternalLink, Phone, Loader2, CreditCard, Wallet } from 'lucide-react'

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
    const [mpesaConsumerKey, setMpesaConsumerKey] = useState('')
    const [mpesaConsumerSecret, setMpesaConsumerSecret] = useState('')
    const [mpesaPasskey, setMpesaPasskey] = useState('')

    // PayPal
    const [paypalEnabled, setPaypalEnabled] = useState(false)
    const [paypalClientId, setPaypalClientId] = useState('')
    const [paypalSecret, setPaypalSecret] = useState('')
    const [paypalMode, setPaypalMode] = useState<'sandbox' | 'live'>('sandbox')

    // Pesapal
    const [pesapalEnabled, setPesapalEnabled] = useState(false)
    const [pesapalConsumerKey, setPesapalConsumerKey] = useState('')
    const [pesapalConsumerSecret, setPesapalConsumerSecret] = useState('')

    // Intasend
    const [intasendEnabled, setIntasendEnabled] = useState(false)
    const [intasendPublishableKey, setIntasendPublishableKey] = useState('')
    const [intasendSecretKey, setIntasendSecretKey] = useState('')

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch(`/api/store/${slug}/integrations`)
                if (res.ok) {
                    const data = await res.json()
                    const { mpesa, paypal, pesapal, intasend } = data

                    if (mpesa) {
                        setMpesaEnabled(mpesa.enabled ?? false)
                        setMpesaType(mpesa.mpesa_type ?? 'till')
                        setMpesaNumber(mpesa.mpesa_till ?? mpesa.mpesa_paybill ?? '')
                        setMpesaAccount(mpesa.mpesa_account ?? '')
                        setDarajaEnabled(mpesa.darajaEnabled ?? false)
                    }
                    if (paypal) {
                        setPaypalEnabled(paypal.enabled ?? false)
                        setPaypalMode(paypal.mode ?? 'sandbox')
                    }
                    if (pesapal) {
                        setPesapalEnabled(pesapal.enabled ?? false)
                    }
                    if (intasend) {
                        setIntasendEnabled(intasend.enabled ?? false)
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
            const res = await fetch(`/api/store/${slug}/integrations`, {
                method: 'POST',
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
            ...(mpesaPasskey && { passkey: mpesaPasskey })
        })
    }

    const savePaypal = () => {
        handleSave('paypal', {
            enabled: paypalEnabled,
            mode: paypalMode,
            ...(paypalClientId && { clientId: paypalClientId }),
            ...(paypalSecret && { secret: paypalSecret })
        })
    }

    const savePesapal = () => {
        handleSave('pesapal', {
            enabled: pesapalEnabled,
            ...(pesapalConsumerKey && { consumerKey: pesapalConsumerKey }),
            ...(pesapalConsumerSecret && { consumerSecret: pesapalConsumerSecret })
        })
    }

    const saveIntasend = () => {
        handleSave('intasend', {
            enabled: intasendEnabled,
            ...(intasendPublishableKey && { publishableKey: intasendPublishableKey }),
            ...(intasendSecretKey && { secretKey: intasendSecretKey })
        })
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

            {/* Daraja M-PESA */}
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-md bg-green-700 flex items-center justify-center shrink-0">
                        <Phone className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">M-PESA STK Push (Daraja)</p>
                        <p className="text-xs text-muted-foreground">Automated M-PESA via Daraja API</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant={darajaEnabled ? 'default' : 'secondary'} className="text-[10px]">
                            {darajaEnabled ? 'Active' : 'Inactive'}
                        </Badge>
                        <Switch checked={darajaEnabled} onCheckedChange={setDarajaEnabled} />
                    </div>
                </div>

                {darajaEnabled && (
                    <div className="space-y-4 max-w-sm pl-12">
                        <div className="space-y-1.5">
                            <Label>Consumer Key</Label>
                            <Input
                                type="password"
                                value={mpesaConsumerKey}
                                onChange={(e) => setMpesaConsumerKey(e.target.value)}
                                placeholder="Leave blank to keep existing"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Consumer Secret</Label>
                            <Input
                                type="password"
                                value={mpesaConsumerSecret}
                                onChange={(e) => setMpesaConsumerSecret(e.target.value)}
                                placeholder="Leave blank to keep existing"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Passkey (STK Push)</Label>
                            <Input
                                type="password"
                                value={mpesaPasskey}
                                onChange={(e) => setMpesaPasskey(e.target.value)}
                                placeholder="Leave blank to keep existing"
                            />
                        </div>

                        <Button onClick={saveMpesa} disabled={saving === 'mpesa'} className="w-full h-9 text-sm">
                            {saving === 'mpesa' ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : saved === 'mpesa' ? <Check className="w-3.5 h-3.5 mr-1.5" /> : 'Save Daraja settings'}
                        </Button>
                    </div>
                )}
            </div>

            <Separator />

            {/* PayPal */}
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-md bg-[#003087] flex items-center justify-center shrink-0">
                        <span className="text-white text-xs font-bold">PP</span>
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">PayPal</p>
                        <p className="text-xs text-muted-foreground">Accept international payments via PayPal</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant={paypalEnabled ? 'default' : 'secondary'} className="text-[10px]">
                            {paypalEnabled ? 'Active' : 'Inactive'}
                        </Badge>
                        <Switch checked={paypalEnabled} onCheckedChange={setPaypalEnabled} />
                    </div>
                </div>

                {paypalEnabled && (
                    <div className="space-y-4 max-w-sm pl-12">
                        <div className="space-y-1.5">
                            <Label>Mode</Label>
                            <div className="flex rounded-md border overflow-hidden">
                                {(['sandbox', 'live'] as const).map((t) => (
                                    <button
                                        key={t}
                                        onClick={() => setPaypalMode(t)}
                                        className={`flex-1 h-9 text-xs transition-colors ${paypalMode === t ? 'bg-foreground text-background font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                                    >
                                        {t === 'sandbox' ? 'Sandbox' : 'Live'}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Client ID</Label>
                            <Input
                                type="password"
                                value={paypalClientId}
                                onChange={(e) => setPaypalClientId(e.target.value)}
                                placeholder="Leave blank to keep existing"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Client Secret</Label>
                            <Input
                                type="password"
                                value={paypalSecret}
                                onChange={(e) => setPaypalSecret(e.target.value)}
                                placeholder="Leave blank to keep existing"
                            />
                        </div>
                        <Button onClick={savePaypal} disabled={saving === 'paypal'} className="w-full h-9 text-sm">
                            {saving === 'paypal' ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : saved === 'paypal' ? <Check className="w-3.5 h-3.5 mr-1.5" /> : 'Save PayPal settings'}
                        </Button>
                    </div>
                )}
            </div>

            <Separator />

            {/* Pesapal */}
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-md bg-blue-600 flex items-center justify-center shrink-0">
                        <CreditCard className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">Pesapal</p>
                        <p className="text-xs text-muted-foreground">Accept cards and mobile money via Pesapal</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant={pesapalEnabled ? 'default' : 'secondary'} className="text-[10px]">
                            {pesapalEnabled ? 'Active' : 'Inactive'}
                        </Badge>
                        <Switch checked={pesapalEnabled} onCheckedChange={setPesapalEnabled} />
                    </div>
                </div>

                {pesapalEnabled && (
                    <div className="space-y-4 max-w-sm pl-12">
                        <div className="space-y-1.5">
                            <Label>Consumer Key</Label>
                            <Input
                                type="password"
                                value={pesapalConsumerKey}
                                onChange={(e) => setPesapalConsumerKey(e.target.value)}
                                placeholder="Leave blank to keep existing"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Consumer Secret</Label>
                            <Input
                                type="password"
                                value={pesapalConsumerSecret}
                                onChange={(e) => setPesapalConsumerSecret(e.target.value)}
                                placeholder="Leave blank to keep existing"
                            />
                        </div>
                        <Button onClick={savePesapal} disabled={saving === 'pesapal'} className="w-full h-9 text-sm">
                            {saving === 'pesapal' ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : saved === 'pesapal' ? <Check className="w-3.5 h-3.5 mr-1.5" /> : 'Save Pesapal settings'}
                        </Button>
                    </div>
                )}
            </div>

            <Separator />

            {/* Intasend */}
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-md bg-purple-600 flex items-center justify-center shrink-0">
                        <Wallet className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">Intasend</p>
                        <p className="text-xs text-muted-foreground">Accept cards and mobile money via Intasend</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant={intasendEnabled ? 'default' : 'secondary'} className="text-[10px]">
                            {intasendEnabled ? 'Active' : 'Inactive'}
                        </Badge>
                        <Switch checked={intasendEnabled} onCheckedChange={setIntasendEnabled} />
                    </div>
                </div>

                {intasendEnabled && (
                    <div className="space-y-4 max-w-sm pl-12">
                        <div className="space-y-1.5">
                            <Label>Publishable Key</Label>
                            <Input
                                type="password"
                                value={intasendPublishableKey}
                                onChange={(e) => setIntasendPublishableKey(e.target.value)}
                                placeholder="Leave blank to keep existing"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Secret Key</Label>
                            <Input
                                type="password"
                                value={intasendSecretKey}
                                onChange={(e) => setIntasendSecretKey(e.target.value)}
                                placeholder="Leave blank to keep existing"
                            />
                        </div>
                        <Button onClick={saveIntasend} disabled={saving === 'intasend'} className="w-full h-9 text-sm">
                            {saving === 'intasend' ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : saved === 'intasend' ? <Check className="w-3.5 h-3.5 mr-1.5" /> : 'Save Intasend settings'}
                        </Button>
                    </div>
                )}
            </div>

        </div>
    )
}