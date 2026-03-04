'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Check, ExternalLink, Phone, Loader2 } from 'lucide-react'

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
                const m = data?.find((i: any) => i.provider === 'mpesa') ?? null
                const p = data?.find((i: any) => i.provider === 'paypal') ?? null
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
                <h2 className="text-base font-semibold text-foreground">Payment Integrations</h2>
                <p className="text-sm text-muted-foreground mt-0.5">Configure how customers pay in your store</p>
            </div>

            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-md bg-green-600 flex items-center justify-center shrink-0">
                        <Phone className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">M-PESA</p>
                        <p className="text-xs text-muted-foreground">Receive payments via Safaricom M-PESA</p>
                    </div>
                    <Badge variant={mpesa?.is_active ? 'default' : 'secondary'} className="text-[10px]">
                        {mpesa?.is_active ? 'Active' : 'Not configured'}
                    </Badge>
                </div>

                <div className="space-y-4 max-w-sm pl-12">
                    <div className="space-y-1.5">
                        <Label className="text-sm">Payment type</Label>
                        <div className="flex rounded-md border overflow-hidden">
                            {(['till', 'paybill'] as const).map((t) => (
                                <button
                                    key={t}
                                    onClick={() => setMpesaType(t)}
                                    className={`flex-1 h-9 text-xs transition-colors ${mpesaType === t
                                        ? 'bg-foreground text-background font-medium'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
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
                                placeholder="e.g. your store name"
                            />
                            <p className="text-xs text-muted-foreground">
                                Customers will enter this as the account when paying
                            </p>
                        </div>
                    )}

                    {error && (
                        <p className="text-xs text-destructive bg-destructive/10 rounded px-3 py-2">{error}</p>
                    )}

                    <Button
                        onClick={handleSaveMpesa}
                        disabled={saving || !mpesaNumber.trim()}
                        className="w-full h-9 text-sm"
                    >
                        {saving ? (
                            <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Saving...</>
                        ) : saved ? (
                            <><Check className="w-3.5 h-3.5 mr-1.5" />Saved</>
                        ) : (
                            'Save M-PESA settings'
                        )}
                    </Button>
                </div>
            </div>

            <Separator />

            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-md bg-[#003087] flex items-center justify-center shrink-0">
                        <span className="text-white text-xs font-bold">PP</span>
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">PayPal</p>
                        <p className="text-xs text-muted-foreground">Accept international payments via PayPal</p>
                    </div>
                    <Badge variant={paypal?.is_active ? 'default' : 'secondary'} className="text-[10px]">
                        {paypal?.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                </div>

                <Card className="border-dashed max-w-sm ml-12">
                    <CardContent className="pt-4 pb-4 space-y-3">
                        <p className="text-sm text-muted-foreground">
                            PayPal integration is managed by Menengai Cloud support.{' '}
                            {paypal?.is_active
                                ? 'Your store currently has PayPal enabled.'
                                : 'Contact us to enable PayPal for your store.'}
                        </p>
                        <a
                            href={`mailto:support@menengai.cloud?subject=PayPal Integration Request&body=Store ID: ${storeId}`}
                            className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline underline-offset-4"
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                            {paypal?.is_active ? 'Request to disable PayPal' : 'Request PayPal activation'}
                        </a>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}