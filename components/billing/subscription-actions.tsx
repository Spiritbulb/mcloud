// /components/billing/subscription-actions.tsx
"use client"

import { useState } from "react"
import { createClient } from "@/lib/client"
import { useRouter } from "next/navigation"
import { AlertCircle, CheckCircle } from "lucide-react"

interface SubscriptionActionsProps {
    planId: string
    planName: string
    planPrice: number
    isCurrent: boolean
    isDowngrade: boolean
    userId: string
    currentSubscriptionId?: string
    slug: string
}

export function SubscriptionActions({
    planId,
    planName,
    planPrice,
    isCurrent,
    isDowngrade,
    userId,
    currentSubscriptionId,
    slug,
}: SubscriptionActionsProps) {
    const router = useRouter()
    const supabase = createClient()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    const handleSubscribe = async () => {
        setLoading(true)
        setError(null)
        setSuccess(false)

        try {
            const now = new Date()
            const nextMonth = new Date(now)
            nextMonth.setMonth(nextMonth.getMonth() + 1)

            // If upgrading/downgrading existing subscription
            if (currentSubscriptionId) {
                // Cancel current subscription
                await supabase
                    .from('subscriptions')
                    .update({
                        status: 'canceled',
                        canceled_at: now.toISOString(),
                        updated_at: now.toISOString(),
                    })
                    .eq('id', currentSubscriptionId)
            }

            // Create new subscription
            const { data: newSubscription, error: subError } = await supabase
                .from('subscriptions')
                .insert({
                    user_id: userId,
                    plan_id: planId,
                    status: 'active',
                    billing_cycle: 'monthly',
                    current_period_start: now.toISOString(),
                    current_period_end: nextMonth.toISOString(),
                })
                .select()
                .single()

            if (subError) throw subError

            // Create invoice for the subscription
            const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

            const { data: invoice, error: invError } = await supabase
                .from('invoices')
                .insert({
                    user_id: userId,
                    subscription_id: newSubscription.id,
                    invoice_number: invoiceNumber,
                    amount_due: planPrice,
                    amount_paid: 0,
                    currency: 'KES',
                    status: 'open',
                    due_date: nextMonth.toISOString(),
                    description: `${planName} Plan - Monthly Subscription`,
                })
                .select()
                .single()

            if (invError) throw invError

            setSuccess(true)

            // Redirect to payment page
            setTimeout(() => {
                router.push(`/${slug}/billing/invoices/${invoice.id}/pay`)
            }, 1500)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleCancelSubscription = async () => {
        if (!currentSubscriptionId) return

        const confirmed = confirm('Are you sure you want to cancel your subscription?')
        if (!confirmed) return

        setLoading(true)
        setError(null)

        try {
            const { error: cancelError } = await supabase
                .from('subscriptions')
                .update({
                    status: 'canceled',
                    canceled_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .eq('id', currentSubscriptionId)

            if (cancelError) throw cancelError

            setSuccess(true)
            router.refresh()
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    if (error) {
        return (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-surface-variant border border-outline">
                <AlertCircle className="h-4 w-4 text-on-surface-variant flex-shrink-0" />
                <p className="text-xs text-on-surface">{error}</p>
            </div>
        )
    }

    if (success) {
        return (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-surface-variant border border-outline">
                <CheckCircle className="h-4 w-4 text-on-surface-variant flex-shrink-0" />
                <p className="text-xs text-on-surface">
                    {isCurrent ? 'Subscription canceled' : 'Redirecting to payment...'}
                </p>
            </div>
        )
    }

    if (isCurrent) {
        return (
            <div className="space-y-2">
                <button
                    className="google-button-secondary w-full py-2 px-4 text-body-medium"
                    disabled
                >
                    Current Plan
                </button>
                <button
                    onClick={handleCancelSubscription}
                    className="w-full py-2 px-4 text-sm text-on-surface-variant hover:text-on-surface transition-colors"
                    disabled={loading}
                >
                    {loading ? 'Canceling...' : 'Cancel Subscription'}
                </button>
            </div>
        )
    }

    return (
        <button
            onClick={handleSubscribe}
            className="google-button-primary w-full py-2 px-4 text-body-medium disabled:opacity-50"
            disabled={loading}
        >
            {loading
                ? 'Processing...'
                : isDowngrade
                    ? 'Downgrade'
                    : currentSubscriptionId
                        ? 'Upgrade'
                        : 'Subscribe'
            }
        </button>
    )
}
