// /app/[slug]/billing/invoices/[id]/pay/page.tsx
"use client"

import { useState, useEffect } from "react"
import { PageHeader } from "@/components/admin/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/client"
import { useRouter, useParams } from "next/navigation"
import { AlertCircle, CheckCircle, Smartphone, Copy } from "lucide-react"
import { PAYMENT_CONFIG } from "@/lib/payment-config"

export default function PayInvoicePage() {
    const router = useRouter()
    const params = useParams()
    const slug = params.slug as string
    const invoiceId = params.id as string
    const supabase = createClient()

    const [loading, setLoading] = useState(true)
    const [paying, setPaying] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const [copied, setCopied] = useState(false)

    const [invoice, setInvoice] = useState<any>(null)
    const [paymentMethods, setPaymentMethods] = useState<any[]>([])
    const [selectedPhone, setSelectedPhone] = useState("")
    const [transactionCode, setTransactionCode] = useState("")

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            // Get invoice
            const { data: inv } = await supabase
                .from('invoices')
                .select('*')
                .eq('id', invoiceId)
                .single()

            setInvoice(inv)

            // Get saved phone numbers
            const { data: methods } = await supabase
                .from('payment_methods')
                .select('*')
                .eq('user_id', user.id)
                .eq('type', 'mpesa')

            setPaymentMethods(methods || [])

            if (methods && methods.length > 0) {
                const defaultMethod = methods.find(m => m.is_default) || methods[0]
                setSelectedPhone(defaultMethod.mpesa_phone)
            }
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handlePayment = async (e: React.FormEvent) => {
        e.preventDefault()
        setPaying(true)
        setError(null)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            // Record transaction for verification
            const { error: txError } = await supabase
                .from('payment_transactions')
                .insert({
                    user_id: user.id,
                    invoice_id: invoiceId,
                    amount: invoice.amount_due,
                    currency: invoice.currency,
                    status: 'pending',
                    payment_provider: 'mpesa',
                    provider_transaction_id: transactionCode,
                    metadata: {
                        phone: selectedPhone,
                        transaction_code: transactionCode,
                        till_number: PAYMENT_CONFIG.mpesa.tillNumber,
                    }
                })

            if (txError) throw txError

            // Update invoice status to pending verification
            await supabase
                .from('invoices')
                .update({
                    status: 'open',
                    updated_at: new Date().toISOString()
                })
                .eq('id', invoiceId)

            setSuccess(true)
            setTimeout(() => {
                router.push(`/${slug}/billing/invoices`)
            }, 3000)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setPaying(false)
        }
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-KE', {
            style: 'currency',
            currency: 'KES',
            minimumFractionDigits: 0,
        }).format(amount / 100)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Pay Invoice"
                description={`Invoice ${invoice?.invoice_number} - ${PAYMENT_CONFIG.mpesa.businessName}`}
            />

            {error && (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-surface-variant border border-outline">
                    <AlertCircle className="h-5 w-5 text-on-surface-variant flex-shrink-0" />
                    <p className="text-sm text-on-surface">{error}</p>
                </div>
            )}

            {success && (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-surface-variant border border-outline">
                    <CheckCircle className="h-5 w-5 text-on-surface-variant flex-shrink-0" />
                    <p className="text-sm text-on-surface">
                        Payment submitted! We'll verify and update your invoice within 24 hours.
                    </p>
                </div>
            )}

            <div className="grid gap-6 lg:grid-cols-2">
                <Card className="google-card border-outline bg-surface">
                    <CardHeader>
                        <CardTitle className="text-headline-small text-on-surface">
                            M-Pesa Payment Instructions
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                            <p className="text-sm font-medium text-on-surface mb-2">
                                Pay to: {PAYMENT_CONFIG.mpesa.businessName}
                            </p>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-on-surface-variant mb-1">Till Number</p>
                                    <p className="text-3xl font-bold text-primary">
                                        {PAYMENT_CONFIG.mpesa.tillNumber}
                                    </p>
                                </div>
                                <button
                                    onClick={() => copyToClipboard(PAYMENT_CONFIG.mpesa.tillNumber)}
                                    className="google-button-secondary py-2 px-3 text-sm flex items-center gap-2"
                                >
                                    <Copy className="h-4 w-4" />
                                    {copied ? 'Copied!' : 'Copy'}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 p-4 rounded-lg bg-surface-variant">
                            <div className="h-8 w-8 flex items-center justify-center rounded-full bg-primary text-white font-bold flex-shrink-0">
                                1
                            </div>
                            <div>
                                <p className="text-sm font-medium text-on-surface mb-1">
                                    Open M-Pesa on your phone
                                </p>
                                <p className="text-xs text-on-surface-variant">
                                    Dial *334# or use the Safaricom app
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 p-4 rounded-lg bg-surface-variant">
                            <div className="h-8 w-8 flex items-center justify-center rounded-full bg-primary text-white font-bold flex-shrink-0">
                                2
                            </div>
                            <div>
                                <p className="text-sm font-medium text-on-surface mb-1">
                                    Select "Lipa na M-Pesa" → "Buy Goods and Services"
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 p-4 rounded-lg bg-surface-variant">
                            <div className="h-8 w-8 flex items-center justify-center rounded-full bg-primary text-white font-bold flex-shrink-0">
                                3
                            </div>
                            <div>
                                <p className="text-sm font-medium text-on-surface mb-1">
                                    Enter Till Number: <span className="font-mono text-primary">{PAYMENT_CONFIG.mpesa.tillNumber}</span>
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 p-4 rounded-lg bg-surface-variant">
                            <div className="h-8 w-8 flex items-center justify-center rounded-full bg-primary text-white font-bold flex-shrink-0">
                                4
                            </div>
                            <div>
                                <p className="text-sm font-medium text-on-surface mb-1">
                                    Enter Amount
                                </p>
                                <p className="text-2xl font-bold text-primary">
                                    {formatCurrency(invoice?.amount_due || 0)}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 p-4 rounded-lg bg-surface-variant">
                            <div className="h-8 w-8 flex items-center justify-center rounded-full bg-primary text-white font-bold flex-shrink-0">
                                5
                            </div>
                            <div>
                                <p className="text-sm font-medium text-on-surface mb-1">
                                    Enter your M-Pesa PIN and confirm
                                </p>
                                <p className="text-xs text-on-surface-variant">
                                    You'll receive an SMS with the transaction code
                                </p>
                            </div>
                        </div>

                        <div className="p-3 rounded-lg bg-surface-variant border border-outline">
                            <p className="text-xs text-on-surface-variant">
                                💡 <strong>Tip:</strong> Save the M-Pesa confirmation SMS - you'll need the transaction code in the next step
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="google-card border-outline bg-surface">
                    <CardHeader>
                        <CardTitle className="text-headline-small text-on-surface">
                            Confirm Your Payment
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handlePayment} className="space-y-6">
                            <div className="p-4 rounded-lg bg-surface-variant">
                                <div className="flex justify-between mb-2">
                                    <span className="text-sm text-on-surface-variant">Invoice</span>
                                    <span className="text-sm font-medium text-on-surface">
                                        {invoice?.invoice_number}
                                    </span>
                                </div>
                                <div className="flex justify-between mb-2">
                                    <span className="text-sm text-on-surface-variant">Description</span>
                                    <span className="text-sm font-medium text-on-surface">
                                        {invoice?.description || 'Service Payment'}
                                    </span>
                                </div>
                                <div className="flex justify-between pt-2 border-t border-outline">
                                    <span className="text-sm font-medium text-on-surface-variant">Amount Due</span>
                                    <span className="text-lg font-bold text-on-surface">
                                        {formatCurrency(invoice?.amount_due || 0)}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone" className="text-on-surface">
                                    Phone Number Used for Payment
                                </Label>
                                {paymentMethods.length > 0 ? (
                                    <Select value={selectedPhone} onValueChange={setSelectedPhone}>
                                        <SelectTrigger className="bg-surface border-outline">
                                            <SelectValue placeholder="Select phone number" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {paymentMethods.map((method) => (
                                                <SelectItem key={method.id} value={method.mpesa_phone}>
                                                    {method.mpesa_phone}
                                                </SelectItem>
                                            ))}
                                            <SelectItem value="other">Use different number</SelectItem>
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <Input
                                        id="phone"
                                        type="tel"
                                        value={selectedPhone}
                                        onChange={(e) => setSelectedPhone(e.target.value)}
                                        placeholder="254712345678"
                                        required
                                        className="bg-surface border-outline"
                                    />
                                )}
                                {selectedPhone === 'other' && (
                                    <Input
                                        type="tel"
                                        value={selectedPhone !== 'other' ? selectedPhone : ''}
                                        onChange={(e) => setSelectedPhone(e.target.value)}
                                        placeholder="254712345678"
                                        required
                                        className="bg-surface border-outline mt-2"
                                    />
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="code" className="text-on-surface">
                                    M-Pesa Transaction Code
                                </Label>
                                <Input
                                    id="code"
                                    value={transactionCode}
                                    onChange={(e) => setTransactionCode(e.target.value.toUpperCase())}
                                    placeholder="e.g., QJ12K3L4M5"
                                    required
                                    maxLength={10}
                                    className="bg-surface border-outline font-mono text-lg tracking-wider"
                                />
                                <p className="text-xs text-on-surface-variant">
                                    Find this code in your M-Pesa confirmation SMS (e.g., "QJ12K3L4M5 Confirmed...")
                                </p>
                            </div>

                            <div className="p-3 rounded-lg bg-surface-variant border border-outline">
                                <p className="text-xs text-on-surface-variant">
                                    ⏱️ Your payment will be verified within 24 hours. You'll receive an email confirmation once verified.
                                </p>
                            </div>

                            <button
                                type="submit"
                                className="google-button-primary w-full py-3 px-4 text-body-medium disabled:opacity-50"
                                disabled={paying || !transactionCode || !selectedPhone}
                            >
                                {paying ? 'Submitting...' : 'Submit Payment for Verification'}
                            </button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
