'use client'

import '@/app/(storefront)/store/[slug]/storefront.css'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useStoreHref } from '@/contexts/StoreContext'
import { useSearchParam } from '@/hooks/useSearchParam'
import { describeOrder, formatAddress, type OrderView } from '@/lib/order-view'

type Payload = { order: OrderView; signedIn: boolean; owner: boolean }

const POLL_MS = 6000
const POLL_MAX = 20 // about two minutes: long enough for an STK prompt, then stop asking

function money(n: number, currency: string) {
    return `${currency} ${n.toLocaleString('en-KE', { maximumFractionDigits: 2 })}`
}

export default function OrderPage() {
    const { slug, orderNumber } = useParams<{ slug: string; orderNumber: string }>()
    const href = useStoreHref()
    const [data, setData] = useState<Payload | null>(null)
    const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading')
    const justPaid = useSearchParam('payment') === 'success'

    useEffect(() => {
        if (!slug || !orderNumber) return
        let cancelled = false
        let timer: ReturnType<typeof setTimeout> | undefined
        let attempts = 0

        const load = async () => {
            try {
                const res = await fetch(`/api/store/${slug}/orders/${encodeURIComponent(orderNumber)}`, { credentials: 'include' })
                if (cancelled) return
                if (res.status === 404) return setState('missing')
                if (!res.ok) return setState('error')
                const payload = (await res.json()) as Payload
                setData(payload)
                setState('ready')
                // While payment is unconfirmed, keep checking, gently and only for a while.
                if (payload.order.status === 'pending' && ++attempts < POLL_MAX) timer = setTimeout(load, POLL_MS)
            } catch {
                if (!cancelled) setState('error')
            }
        }
        void load()
        return () => {
            cancelled = true
            if (timer) clearTimeout(timer)
        }
    }, [slug, orderNumber])

    const here = href(`/orders/${encodeURIComponent(orderNumber ?? '')}`)
    const next = encodeURIComponent(here)

    if (state === 'loading') {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="h-7 w-7 rounded-full border-2 border-black border-t-transparent animate-spin" />
            </div>
        )
    }

    if (state === 'missing' || state === 'error' || !data) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 px-4 text-center">
                <h1 className="text-xl font-light">{state === 'missing' ? "We couldn't find that order" : 'Something went wrong'}</h1>
                <p className="text-sm text-muted-foreground max-w-sm">
                    {state === 'missing'
                        ? 'Check the order number in your confirmation, or sign in to see your orders.'
                        : 'We could not load your order just now. Please refresh in a moment.'}
                </p>
                <Link href={href('/account/login')} className="text-sm underline underline-offset-4">Sign in to see your orders</Link>
            </div>
        )
    }

    const { order, signedIn, owner } = data
    const summary = describeOrder(order.status, order.fulfillmentStatus)
    const full = order.detail === 'full' ? order : null
    const address = full ? formatAddress(full.shippingAddress) : null

    return (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-8">
            {justPaid && summary.paid && (
                <p role="status" className="text-sm bg-green-50 text-green-700 px-3 py-2">Payment received. Thank you!</p>
            )}

            <div className="space-y-1">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Order</p>
                <h1 className="text-2xl font-light tracking-tight break-all">{order.orderNumber}</h1>
                {order.createdAt && (
                    <p className="text-xs text-muted-foreground">
                        {new Date(order.createdAt).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                )}
            </div>

            <div className="border p-4 space-y-1">
                <p className="text-sm font-medium">{summary.headline}</p>
                <p className="text-sm text-muted-foreground">{summary.detail}</p>
            </div>

            <div className="border p-4 space-y-3">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Items</p>
                {order.items.map((item, i) => (
                    <div key={i} className="flex justify-between gap-4 text-sm">
                        <span>
                            {item.title}
                            {item.variantTitle ? <span className="text-muted-foreground"> · {item.variantTitle}</span> : null} × {item.quantity}
                        </span>
                        {'total' in item ? <span>{money(item.total, order.currency)}</span> : null}
                    </div>
                ))}
                <div className="border-t pt-3 space-y-1 text-sm">
                    {full && (
                        <>
                            {full.subtotal !== null && (
                                <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{money(full.subtotal, order.currency)}</span></div>
                            )}
                            <div className="flex justify-between text-muted-foreground"><span>Delivery</span><span>{full.shipping > 0 ? money(full.shipping, order.currency) : 'Free'}</span></div>
                        </>
                    )}
                    <div className="flex justify-between font-medium"><span>Total</span><span>{money(order.total, order.currency)}</span></div>
                </div>
            </div>

            {full && (
                <div className="border p-4 space-y-3 text-sm">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Delivery &amp; contact</p>
                    {full.trackingNumber && <p>Tracking number: <span className="font-medium">{full.trackingNumber}</span></p>}
                    {full.contact.phone && <p>Phone: {full.contact.phone}</p>}
                    {full.contact.email && <p>Email: {full.contact.email}</p>}
                    {address && <p className="text-muted-foreground">{address}</p>}
                    {!full.trackingNumber && !full.contact.phone && !full.contact.email && !address && (
                        <p className="text-muted-foreground">No delivery details on this order.</p>
                    )}
                </div>
            )}

            {!owner && (
                <div className="border border-black/20 p-5 space-y-3">
                    {signedIn ? (
                        <>
                            <p className="text-sm font-medium">This order isn&apos;t linked to your account</p>
                            <p className="text-sm text-muted-foreground">
                                Sign in with the email you used at checkout to see delivery details and your receipt.
                            </p>
                            <Link href={href('/account/dashboard')} className="text-sm underline underline-offset-4">Go to your account</Link>
                        </>
                    ) : (
                        <>
                            <p className="text-sm font-medium">Want the full details?</p>
                            <p className="text-sm text-muted-foreground">
                                Sign in to see delivery details, tracking and your receipt, and to find all your orders in one place.
                            </p>
                            <div className="flex flex-wrap gap-4 items-center">
                                <Link href={`${href('/account/login')}?next=${next}`} className="sf-btn-primary inline-flex px-5 py-2.5 text-sm">
                                    Sign in
                                </Link>
                                <Link href={`${href('/account/register')}?next=${next}`} className="text-sm underline underline-offset-4">
                                    Create an account
                                </Link>
                            </div>
                        </>
                    )}
                </div>
            )}

            <Link href={href('/')} className="inline-block text-sm text-muted-foreground underline underline-offset-4">← Back to the store</Link>
        </div>
    )
}
