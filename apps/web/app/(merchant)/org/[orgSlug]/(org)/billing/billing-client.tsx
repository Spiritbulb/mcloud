'use client'

import { useMemo, useState, useTransition } from 'react'
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
    planLabel,
    shortfallMessage,
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
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [isPending, startTransition] = useTransition()
    const [showTopup, setShowTopup] = useState(false)

    async function refreshBalance() {
        const res = await fetch(`/api/org/${orgSlug}/wallet/balance`, { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        if (typeof data.balanceCents === 'number') setBalance(data.balanceCents)
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
        setErrors((current) => ({ ...current, [store.id]: shortfall ?? '' }))
        if (!shortfall) setConfirming({ store, plan })
    }

    function purchase(storeId: string, plan: PaidPlan) {
        setPendingPurchase({ storeId, plan })
        startTransition(async () => {
            const result = await purchaseStorePlan(orgSlug, storeId, plan)
            setPendingPurchase(null)
            setConfirming(null)
            if (!result.ok) {
                setErrors((current) => ({ ...current, [storeId]: result.error }))
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
                    <Button variant="primary" onClick={() => setShowTopup(true)}>
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
                                                    {error && <p role="alert" className="mt-0.5 max-w-sm text-[12px] text-red-700 dark:text-red-300">{error}</p>}
                                                </div>
                                            </div>
                                        </Td>
                                        <Td label="Plan"><PlanBadge plan={currentPlan} /></Td>
                                        <Td label="Renews" muted>{paid ? formatDate(renewal ?? null) : '—'}</Td>
                                        <Td label="Cost" align="right">{paid ? `${formatKes(PLAN_PRICE_KES[currentPlan])}/mo` : '—'}</Td>
                                        {canManage && (
                                            <Td align="right" label="Change plan">
                                                <div className="inline-flex flex-wrap justify-end gap-1.5">
                                                    {(['hobby', 'pro'] as const).map((plan) => (
                                                        <Button
                                                            key={plan}
                                                            size="sm"
                                                            variant={plan === 'pro' ? 'primary' : 'secondary'}
                                                            disabled={storePending}
                                                            title={`${formatKes(PLAN_PRICE_KES[plan])}/mo`}
                                                            onClick={() => requestPurchase(store, plan)}
                                                        >
                                                            {storePending && pendingPurchase?.plan === plan && <Spinner size={11} />}
                                                            {planActionLabel(currentPlan, plan)}
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
                    <p className="border-t border-border bg-muted/30 px-4 py-3 text-[12px] text-muted-foreground">You have view-only access to billing.</p>
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

            <WalletTopupModal
                orgSlug={orgSlug}
                open={showTopup}
                onClose={() => setShowTopup(false)}
                onTopupInitiated={() => {
                    window.setTimeout(() => {
                        void refreshBalance()
                    }, 15_000)
                }}
            />
        </div>
    )
}
