'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { PLAN_PRICE_KES } from '@mcloud/merchant/plans'
import { Avatar } from '@mcloud/ui/kit/avatar'
import { Button } from '@mcloud/ui/kit/button'
import { ConfirmDialog } from '@mcloud/ui/kit/confirm-dialog'
import { EmptyState } from '@mcloud/ui/kit/empty-state'
import { Icon } from '@mcloud/ui/kit/icon'
import { Notice } from '@mcloud/ui/kit/notice'
import { PageHeader } from '@mcloud/ui/kit/page-header'
import { Panel } from '@mcloud/ui/kit/panel'
import { Spinner } from '@mcloud/ui/kit/skeleton'
import { Stat, StatStrip } from '@mcloud/ui/kit/stat-strip'
import { Table, Td, Th, Tr } from '@mcloud/ui/kit/table'
import { PlanBadge } from '../plan-badge'
import { purchaseStorePlan } from './actions'
import { WalletTopupModal } from '@/components/topup-modal'
import {
    currentPlanOf,
    formatDate,
    formatKes,
    isPaidPlanName,
    planActionLabel,
    planBenefits,
    planButtonLabel,
    planLabel,
    pollStep,
    shortfallMessage,
    topupAmountFor,
    type PaidPlan,
    type StoreSubscription,
} from './billing-logic'

type StoreRow = {
    id: string
    name: string
    slug: string
    logo_url: string | null
    icon_url?: string | null
    is_pro: boolean
    pro_expires_at: string | null
    subscription: StoreSubscription
}

/** A message under a store row. `shortfall` ones offer a top-up for `plan`. */
type RowError = { message: string; plan?: PaidPlan; shortfall?: boolean }

/** Check the balance this often, this many times, after a shortfall top-up prompt (2 minutes). */
const POLL_MS = 5_000
const POLL_TRIES = 24
const BALANCE_READY = 'Your balance is updated. Choose the plan again to pay.'
const PAYMENT_NOT_ARRIVED =
    "We haven't received the payment yet. It can take a minute; try the plan again once your balance updates."

export default function BillingClient({
    orgSlug,
    orgName,
    balanceCents,
    stores,
    canManage,
}: {
    orgSlug: string
    orgName: string
    balanceCents: number
    stores: StoreRow[]
    canManage: boolean
}) {
    const [balance, setBalance] = useState(balanceCents)
    const [pendingPurchase, setPendingPurchase] = useState<{ storeId: string; plan: PaidPlan } | null>(null)
    const [confirming, setConfirming] = useState<{ store: StoreRow; plan: PaidPlan } | null>(null)
    const [errors, setErrors] = useState<Record<string, RowError>>({})
    const [isPending, startTransition] = useTransition()
    // The top-up box, when open. `awaiting` is the plan purchase to resume once the money lands.
    const [topup, setTopup] = useState<{ amountKes?: number; awaiting?: { storeId: string; plan: PaidPlan } } | null>(null)
    const [waitingStoreId, setWaitingStoreId] = useState<string | null>(null)
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

    function stopPolling() {
        if (pollRef.current) clearInterval(pollRef.current)
        pollRef.current = null
        setWaitingStoreId(null)
    }

    useEffect(() => () => {
        if (pollRef.current) clearInterval(pollRef.current)
    }, [])

    // The poll runs in an interval, so it reads "is another confirm or purchase open?" from a ref.
    const busyRef = useRef(false)
    useEffect(() => {
        busyRef.current = confirming !== null || pendingPurchase !== null
    }, [confirming, pendingPurchase])

    /** Re-reads the wallet; returns the new balance in cents, or null when it could not be read. */
    async function refreshBalance(): Promise<number | null> {
        const res = await fetch(`/api/org/${orgSlug}/wallet/balance`, { cache: 'no-store' })
        if (!res.ok) return null
        const data = await res.json()
        if (typeof data.balanceCents !== 'number') return null
        setBalance(data.balanceCents)
        return data.balanceCents
    }

    /** After a shortfall top-up: wait for the money, then ask to confirm the plan it was for. */
    function resumeWhenFunded(storeId: string, plan: PaidPlan) {
        const store = stores.find((s) => s.id === storeId)
        if (!store) return
        if (pollRef.current) clearInterval(pollRef.current)
        setWaitingStoreId(storeId)
        let tries = 0
        let checking = false
        const id = setInterval(async () => {
            if (checking) return
            checking = true
            tries += 1
            const cents = await refreshBalance()
            checking = false
            // A newer poll (or unmount) replaced this one while the balance was being read.
            if (pollRef.current !== id) return
            const step = pollStep(cents, PLAN_PRICE_KES[plan], tries, POLL_TRIES, busyRef.current)
            if (step === 'wait') return
            stopPolling()
            if (step === 'confirm') {
                setErrors((current) => ({ ...current, [storeId]: { message: '' } }))
                setConfirming({ store, plan })
            } else {
                const message = step === 'balance-ready' ? BALANCE_READY : PAYMENT_NOT_ARRIVED
                setErrors((current) => ({ ...current, [storeId]: { message } }))
            }
        }, POLL_MS)
        pollRef.current = id
    }

    const balanceKes = balance / 100
    const lowestPlanPrice = Math.min(PLAN_PRICE_KES.hobby, PLAN_PRICE_KES.pro)
    const isLowBalance = stores.length > 0 && balanceKes < lowestPlanPrice

    const activeSubscriptions = useMemo(
        () => stores.filter((s) => isPaidPlanName(currentPlanOf(s.subscription))).length,
        [stores],
    )

    /** First step: check the wallet, then ask before charging it. */
    function requestPurchase(store: StoreRow, plan: PaidPlan) {
        const shortfall = shortfallMessage(balanceKes, plan, PLAN_PRICE_KES[plan])
        setErrors((current) => ({ ...current, [store.id]: { message: shortfall ?? '', plan, shortfall: !!shortfall } }))
        if (!shortfall) setConfirming({ store, plan })
    }

    function purchase(storeId: string, plan: PaidPlan) {
        setPendingPurchase({ storeId, plan })
        startTransition(async () => {
            const result = await purchaseStorePlan(orgSlug, storeId, plan)
            setPendingPurchase(null)
            setConfirming(null)
            if (!result.ok) {
                setErrors((current) => ({ ...current, [storeId]: { message: result.error } }))
                return
            }
            setBalance(result.newBalanceCents)
        })
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Billing"
                description={<>Plans for stores in <span className="font-medium text-foreground">{orgName}</span> are paid from the organization wallet.</>}
                actions={canManage && (
                    <Button variant="primary" onClick={() => setTopup({})}>
                        <Icon name="add" size={16} />
                        Add funds
                    </Button>
                )}
            />

            <StatStrip className="grid-cols-1 sm:grid-cols-3">
                <Stat label="Wallet balance" value={formatKes(balanceKes)} hint={isLowBalance ? 'Below the cheapest plan' : 'Available for plans'} />
                <Stat label="Active subscriptions" value={String(activeSubscriptions)} />
                <Stat label="Stores" value={String(stores.length)} />
            </StatStrip>

            {isLowBalance && <Notice tone="warning">Add funds to your wallet before buying or renewing a plan.</Notice>}

            <Panel title="Plans" description="Each store is on its own plan, paid monthly from the wallet.">
                <div className="grid gap-3 sm:grid-cols-2">
                    {(['hobby', 'pro'] as const).map((plan) => (
                        <div key={plan} className="border border-border p-4">
                            <div className="flex items-baseline justify-between gap-2">
                                <p className="font-semibold">{planLabel(plan)}</p>
                                <p className="text-[14px] font-medium">{formatKes(PLAN_PRICE_KES[plan])}<span className="text-muted-foreground">/mo</span></p>
                            </div>
                            <ul className="mt-2 space-y-1 text-[13px] text-muted-foreground">
                                {planBenefits(plan).map((line) => <li key={line}>{line}</li>)}
                            </ul>
                        </div>
                    ))}
                </div>
            </Panel>

            <Panel title="Store plans" description="Each store has its own plan and billing cycle." flush>
                {stores.length === 0 ? (
                    <EmptyState icon="inventory_2" title="No stores yet" description="Create a store in this organization to manage its plan here." />
                ) : (
                    <Table>
                        <thead>
                            <tr>
                                <Th>Store</Th>
                                <Th>Plan</Th>
                                <Th>Renews</Th>
                                <Th align="right">Cost</Th>
                                {canManage && <Th align="right"><span className="sr-only">Change plan</span></Th>}
                            </tr>
                        </thead>
                        <tbody>
                            {stores.map((store) => {
                                const currentPlan = currentPlanOf(store.subscription)
                                const paid = isPaidPlanName(currentPlan)
                                const renewal = store.subscription?.status === 'active' ? store.subscription.period_end : store.pro_expires_at
                                const storePending = isPending && pendingPurchase?.storeId === store.id
                                const error = errors[store.id]
                                return (
                                    <Tr key={store.id}>
                                        <Td>
                                            <div className="flex items-center gap-3">
                                                <Avatar name={store.name} src={store.icon_url ?? store.logo_url} />
                                                <div className="min-w-0">
                                                    <p className="truncate font-medium">{store.name}</p>
                                                    {error?.message && <p role="alert" className="mt-0.5 max-w-sm text-[13px] text-red-700 dark:text-red-300">{error.message}</p>}
                                                    {canManage && error?.shortfall && error.plan && waitingStoreId === null && (
                                                        <Button
                                                            size="sm"
                                                            variant="secondary"
                                                            className="mt-1.5"
                                                            onClick={() => setTopup({
                                                                amountKes: topupAmountFor(balanceKes, PLAN_PRICE_KES[error.plan!]),
                                                                awaiting: { storeId: store.id, plan: error.plan! },
                                                            })}
                                                        >
                                                            Top up {formatKes(topupAmountFor(balanceKes, PLAN_PRICE_KES[error.plan]))} with M-PESA
                                                        </Button>
                                                    )}
                                                    {waitingStoreId === store.id && (
                                                        <p role="status" className="mt-1 inline-flex items-center gap-1.5 text-[13px] text-muted-foreground">
                                                            <Spinner size={11} /> Waiting for your M-PESA payment…
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </Td>
                                        <Td label="Plan"><PlanBadge plan={currentPlan} /></Td>
                                        <Td label="Renews" muted>{paid ? formatDate(renewal ?? null) : '—'}</Td>
                                        <Td label="Cost" align="right"><span className="whitespace-nowrap">{paid ? `${formatKes(PLAN_PRICE_KES[currentPlan])}/mo` : '—'}</span></Td>
                                        {canManage && (
                                            <Td align="right" label="Change plan">
                                                <div className="inline-flex flex-wrap justify-end gap-1.5">
                                                    {(['hobby', 'pro'] as const).map((plan) => (
                                                        <Button
                                                            key={plan}
                                                            size="sm"
                                                            variant={plan === 'pro' ? 'primary' : 'secondary'}
                                                            disabled={storePending}
                                                            onClick={() => requestPurchase(store, plan)}
                                                        >
                                                            {storePending && pendingPurchase?.plan === plan && <Spinner size={11} />}
                                                            {planButtonLabel(currentPlan, plan)}
                                                        </Button>
                                                    ))}
                                                </div>
                                            </Td>
                                        )}
                                    </Tr>
                                )
                            })}
                        </tbody>
                    </Table>
                )}
                {!canManage && stores.length > 0 && (
                    <p className="border-t border-border bg-muted/30 px-4 py-3 text-[13px] text-muted-foreground">You have view-only access to billing.</p>
                )}
            </Panel>

            <ConfirmDialog
                open={confirming !== null}
                tone="primary"
                title={confirming ? `${planActionLabel(currentPlanOf(confirming.store.subscription), confirming.plan)} for ${confirming.store.name}?` : ''}
                description={confirming && (
                    <>
                        {formatKes(PLAN_PRICE_KES[confirming.plan])} for the {planLabel(confirming.plan)} plan will be taken from the
                        wallet ({formatKes(balanceKes)} available).
                    </>
                )}
                confirmLabel={confirming ? `Pay ${formatKes(PLAN_PRICE_KES[confirming.plan])}` : 'Pay'}
                busy={isPending}
                onConfirm={() => confirming && purchase(confirming.store.id, confirming.plan)}
                onCancel={() => setConfirming(null)}
            />

            {topup && (
                <WalletTopupModal
                    orgSlug={orgSlug}
                    open
                    initialAmountKes={topup.amountKes}
                    onClose={() => setTopup(null)}
                    onTopupInitiated={() => {
                        if (topup.awaiting) {
                            resumeWhenFunded(topup.awaiting.storeId, topup.awaiting.plan)
                            return
                        }
                        window.setTimeout(() => {
                            void refreshBalance()
                        }, 15_000)
                    }}
                />
            )}
        </div>
    )
}
