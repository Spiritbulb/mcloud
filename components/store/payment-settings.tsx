'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Check, ExternalLink, Phone } from 'lucide-react'

interface PaymentConfig {
    mpesa_paybill?: string
    mpesa_account?: string
    mpesa_till?: string
    mpesa_type?: 'paybill' | 'till'
}

interface Integration {
    id: string
    provider: string
    is_active: boolean
    config: PaymentConfig
}

export default function PaymentSettings({ storeId }: { storeId: string }) {
    const [mpesa, setMpesa] = useState<Integration | null>(null)
    const [paypal, setPaypal] = useState<Integration | null>(null)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // M-PESA form fields
    const [mpesaType, setMpesaType] = useState<'paybill' | 'till'>('till')
    const [mpesaNumber, setMpesaNumber] = useState('')
    const [mpesaAccount, setMpesaAccount] = useState('')

    const supabase = createClient()

    useEffect(() => {
        supabase
            .from('store_integrations')
            .select('*')
            .eq('store_id', storeId)
            .in('provider', ['mpesa', 'paypal'])
            .then(({ data }) => {
                const m = data?.find((i) => i.provider === 'mpesa') ?? null
                const p = data?.find((i) => i.provider === 'paypal') ?? null
                setMpesa(m)
                setPaypal(p)
                if (m) {
                    setMpesaType(m.config?.mpesa_type ?? 'till')
                    setMpesaNumber(m.config?.mpesa_till ?? m.config?.mpesa_paybill ?? '')
                    setMpesaAccount(m.config?.mpesa_account ?? '')
                }
            })
    }, [storeId])

    const handleSaveMpesa = async () => {
        setSaving(true)
        setError(null)
        const config: PaymentConfig = {
            mpesa_type: mpesaType,
            ...(mpesaType === 'till'
                ? { mpesa_till: mpesaNumber }
                : { mpesa_paybill: mpesaNumber, mpesa_account: mpesaAccount }),
        }

        if (mpesa) {
            await supabase
                .from('store_integrations')
                .update({ config, is_active: true })
                .eq('id', mpesa.id)
        } else {
            await supabase.from('store_integrations').insert({
                store_id: storeId,
                provider: 'mpesa',
                is_active: true,
                config,
            })
        }

        setSaving(false)
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
    }

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-base font-semibold mb-1">Payment Integrations</h2>
                <p className="text-sm text-muted-foreground">Configure how customers pay in your store</p>
            </div>

            {/* ── M-PESA ── */}
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-600 flex items-center justify-center">
                        <Phone className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <p className="text-sm font-medium">M-PESA</p>
                        <p className="text-xs text-muted-foreground">Receive payments via Safaricom M-PESA</p>
                    </div>
                    <span className={`ml-auto text-xs px-2 py-0.5 border ${mpesa?.is_active ? 'text-green-700 border-green-300 bg-green-50' : 'text-muted-foreground'}`}>
                        {mpesa?.is_active ? 'Active' : 'Not configured'}
                    </span>
                </div>

                <div className="space-y-4 max-w-sm pl-11">
                    {/* Till vs Paybill toggle */}
                    <div className="grid gap-1.5">
                        <Label className="text-sm">Payment type</Label>
                        <div className="flex gap-2">
                            {(['till', 'paybill'] as const).map((t) => (
                                <button
                                    key={t}
                                    onClick={() => setMpesaType(t)}
                                    className={`flex-1 h-9 text-sm border transition-colors ${mpesaType === t
                                        ? 'bg-foreground text-background border-foreground'
                                        : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                >
                                    {t === 'till' ? 'Till Number' : 'Paybill'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid gap-1.5">
                        <Label className="text-sm">
                            {mpesaType === 'till' ? 'Till Number' : 'Paybill Number'}
                        </Label>
                        <Input
                            value={mpesaNumber}
                            onChange={(e) => setMpesaNumber(e.target.value)}
                            placeholder={mpesaType === 'till' ? '4202518' : '123456'}
                            className="h-9 rounded-none font-mono"
                        />
                    </div>

                    {mpesaType === 'paybill' && (
                        <div className="grid gap-1.5">
                            <Label className="text-sm">Account Number</Label>
                            <Input
                                value={mpesaAccount}
                                onChange={(e) => setMpesaAccount(e.target.value)}
                                placeholder="e.g. your store name"
                                className="h-9 rounded-none"
                            />
                            <p className="text-xs text-muted-foreground">
                                Customers will enter this as the account when paying
                            </p>
                        </div>
                    )}

                    {error && (
                        <p className="text-xs text-destructive bg-destructive/10 px-3 py-2">{error}</p>
                    )}

                    <Button
                        onClick={handleSaveMpesa}
                        disabled={saving || !mpesaNumber.trim()}
                        className="google-button-primary rounded-none h-9 text-sm w-full"
                    >
                        {saving ? (
                            <span className="flex items-center gap-2">
                                <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                Saving...
                            </span>
                        ) : saved ? (
                            <span className="flex items-center gap-2"><Check className="w-3.5 h-3.5" /> Saved</span>
                        ) : (
                            'Save M-PESA settings'
                        )}
                    </Button>
                </div>
            </div>

            <div className="border-t" />

            {/* ── PayPal ── */}
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#003087] flex items-center justify-center">
                        <span className="text-white text-xs font-bold">PP</span>
                    </div>
                    <div>
                        <p className="text-sm font-medium">PayPal</p>
                        <p className="text-xs text-muted-foreground">Accept international payments via PayPal</p>
                    </div>
                    <span className={`ml-auto text-xs px-2 py-0.5 border ${paypal?.is_active ? 'text-green-700 border-green-300 bg-green-50' : 'text-muted-foreground'}`}>
                        {paypal?.is_active ? 'Active' : 'Inactive'}
                    </span>
                </div>

                <div className="border border-dashed p-4 max-w-sm ml-11 space-y-3">
                    <p className="text-sm text-muted-foreground">
                        PayPal integration is managed by Menengai Cloud support.
                        {paypal?.is_active
                            ? ' Your store currently has PayPal enabled.'
                            : ' Contact us to enable PayPal for your store.'}
                    </p>
                    <a
                        href={`mailto:support@menengai.cloud?subject=PayPal Integration Request&body=Store ID: ${storeId}%0AAction: ${paypal?.is_active ? 'Disable' : 'Enable'} PayPal`}
                        className="inline-flex items-center gap-2 text-sm text-foreground font-medium hover:underline underline-offset-4"
                    >
                        <ExternalLink className="w-3.5 h-3.5" />
                        {paypal?.is_active ? 'Request to disable PayPal' : 'Request PayPal activation'} →
                    </a>
                </div>
            </div>
        </div>
    )
}
