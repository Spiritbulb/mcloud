'use client'

import Image from 'next/image'
import { useMemo, useState, useTransition } from 'react'
import {
  AlertCircle,
  Check,
  CreditCard,
  Loader2,
  PackageOpen,
  Sparkles,
  Store,
  Wallet,
} from 'lucide-react'
import { PLAN_PRICE_KES } from '@/lib/plans'
import { purchaseStorePlan } from './actions'
import { WalletTopupModal } from '@/components/topup-modal'

type Plan = 'hobby' | 'pro'

type StoreRow = {
  id: string
  name: string
  slug: string
  logo_url: string | null
  is_pro: boolean
  pro_expires_at: string | null
  subscription: {
    plan: string | null
    status: string
    period_end: string | null
  } | null
}

function formatKes(amount: number) {
  return `KSh ${amount.toLocaleString('en-KE', {
    maximumFractionDigits: 0,
  })}`
}

function formatDate(iso: string | null) {
  if (!iso) return '—'

  const date = new Date(iso)

  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return date.toLocaleDateString('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function planLabel(plan: string | null | undefined) {
  if (!plan) return 'Free'
  return plan.charAt(0).toUpperCase() + plan.slice(1)
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('')
}

function isPaidPlan(plan: string | null | undefined): plan is Plan {
  return plan === 'hobby' || plan === 'pro'
}

function PlanBadge({ plan }: { plan: string | null | undefined }) {
  const isPro = plan === 'pro'
  const isHobby = plan === 'hobby'

  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
        isPro
          ? 'bg-violet-500/10 text-violet-700 ring-1 ring-inset ring-violet-500/20 dark:text-violet-300'
          : isHobby
            ? 'bg-sky-500/10 text-sky-700 ring-1 ring-inset ring-sky-500/20 dark:text-sky-300'
            : 'bg-muted text-muted-foreground ring-1 ring-inset ring-border',
      ].join(' ')}
    >
      {isPro && <Sparkles className="size-3" aria-hidden="true" />}
      {planLabel(plan)}
    </span>
  )
}

function StoreAvatar({
  name,
  logoUrl,
}: {
  name: string
  logoUrl: string | null
}) {
  if (logoUrl) {
    return (
      <div className="relative size-11 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
        <Image
          src={logoUrl}
          alt={`${name} logo`}
          className="object-cover"
          width={120}
          height={120}
          unoptimized
        />
      </div>
    )
  }

  return (
    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
      {getInitials(name) || <Store className="size-4" aria-hidden="true" />}
    </div>
  )
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
  const [pendingPurchase, setPendingPurchase] = useState<{
  storeId: string
  plan: Plan
} | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isPending, startTransition] = useTransition()
  const [showTopup, setShowTopup] = useState(false)

  async function refreshBalance() {
  const res = await fetch(`/api/org/${orgSlug}/wallet/balance`, {
    cache: 'no-store',
  })

  if (!res.ok) return

  const data = await res.json()

  if (typeof data.balanceCents === 'number') {
    setBalance(data.balanceCents)
  }
}

  function openTopupModal() {
  setShowTopup(true)
}

  const balanceKes = balance / 100
  const lowestPlanPrice = Math.min(
    PLAN_PRICE_KES.hobby,
    PLAN_PRICE_KES.pro,
  )

  const activeSubscriptions = useMemo(
    () =>
      stores.filter(
        (store) =>
          store.subscription?.status === 'active' &&
          isPaidPlan(store.subscription.plan),
      ).length,
    [stores],
  )

  const isLowBalance =
    stores.length > 0 && balanceKes < lowestPlanPrice

  function handlePurchase(storeId: string, plan: Plan) {
    const planPrice = PLAN_PRICE_KES[plan]

    setErrors((current) => ({
      ...current,
      [storeId]: '',
    }))

    if (balanceKes < planPrice) {
      setErrors((current) => ({
        ...current,
        [storeId]: `Your wallet balance is too low for the ${planLabel(plan)} plan. Add at least ${formatKes(planPrice - balanceKes)} to continue.`,
      }))
      return
    }

    setPendingPurchase({storeId, plan})

    startTransition(async () => {
      const result = await purchaseStorePlan(orgSlug, storeId, plan)

      setPendingPurchase(null)

      if (!result.ok) {
        setErrors((current) => ({
          ...current,
          [storeId]: result.error,
        }))
        return
      }

      setBalance(result.newBalanceCents)
    })
  }

  return (
    <main className="mx-auto max-w-5xl space-y-8">
      <header className="space-y-2">
        <p className="text-sm font-medium text-primary">Organisation billing</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Plans and subscriptions
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          Manage subscriptions for stores in <span className="font-medium text-foreground">{orgName}</span>.
          Plan charges are deducted from your organisation wallet.
        </p>
      </header>

      <section
        aria-labelledby="wallet-heading"
        className="overflow-hidden shadow-sm"
      >
        <div className="flex flex-col gap-6 sm:flex-row sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Wallet className="size-5" aria-hidden="true" />
            </div>

            <div>
              <h2
                id="wallet-heading"
                className="text-sm font-semibold text-foreground"
              >
                Organisation wallet
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Available funds are used when you renew, upgrade, or activate a
                store plan.
              </p>
            </div>
          </div>

          <div className="sm:text-right">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Available balance
            </p>
            <p className="my-1 text-2xl font-semibold tracking-tight text-foreground">
              {formatKes(balanceKes)}
            </p>
            {canManage && (
    <button
      type="button"
      onClick={openTopupModal}
      className="inline-flex max-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 cursor-pointer"
    >
      <span
        className="material-symbols-outlined text-[18px]"
        aria-hidden="true"
      >
        add
      </span>
      Add funds
    </button>
  )}
            {isLowBalance ? (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-amber-600 sm:justify-end dark:text-amber-400">
                <AlertCircle className="size-3.5" aria-hidden="true" />
                Balance is below the cheapest plan.
              </p>
            ) : (
              <p className="mt-1.5 text-xs text-muted-foreground">
                {activeSubscriptions} active{' '}
                {activeSubscriptions === 1 ? 'subscription' : 'subscriptions'}
              </p>
            )}
          </div>
        </div>

        {isLowBalance && (
          <div className="border-t border-amber-500/20 bg-amber-500/5 px-5 py-3 text-sm text-amber-800 dark:text-amber-200 sm:px-6">
            Add funds to your wallet before purchasing or renewing a plan.
          </div>
        )}
      </section>

      <section aria-labelledby="stores-heading" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2
              id="stores-heading"
              className="text-base font-semibold text-foreground"
            >
              Store subscriptions
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Each store has its own plan and billing cycle.
            </p>
          </div>

          {stores.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {stores.length} {stores.length === 1 ? 'store' : 'stores'}
            </span>
          )}
        </div>

        {stores.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <PackageOpen
                className="size-5 text-muted-foreground"
                aria-hidden="true"
              />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-foreground">
              No stores yet
            </h3>
            <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
              Create a store in this organisation to manage its plan and
              subscription here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {stores.map((store) => {
              const hasActiveSubscription =
                store.subscription?.status === 'active'

              const currentPlan = hasActiveSubscription
                ? store.subscription?.plan
                : null

              const renewalDate = hasActiveSubscription
                ? store.subscription?.period_end
                : store.pro_expires_at

              const currentPaidPlan = isPaidPlan(currentPlan)
              const isStorePending =
  isPending && pendingPurchase?.storeId === store.id

              const error = errors[store.id]

              return (
                <article
                  key={store.id}
                  className="overflow-hidden shadow-sm transition-shadow hover:shadow-md-2"
                >
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3.5">
                      <StoreAvatar name={store.name} logoUrl={store.logo_url} />

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-base font-semibold text-foreground">
                            {store.name}
                          </h3>
                          <PlanBadge plan={currentPlan} />
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          {currentPaidPlan ? (
                            <>
                              <span>
                                Current plan:{' '}
                                <span className="font-medium text-foreground">
                                  {planLabel(currentPlan)}
                                </span>
                              </span>
                              <span>
                                Renews on{' '}
                                <span className="font-medium text-foreground">
                                  {formatDate(renewalDate ?? null)}
                                </span>
                              </span>
                            </>
                          ) : (
                            <span>Currently on the Free plan</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {currentPaidPlan && (
                      <div className="rounded-lg bg-muted/60 px-3 py-2 text-left sm:text-right">
                        <p className="text-xs text-muted-foreground">
                          Monthly cost
                        </p>
                        <p className="mt-0.5 text-sm font-semibold text-foreground">
                          {formatKes(PLAN_PRICE_KES[currentPlan])}/mo
                        </p>
                      </div>
                    )}
                  </div>

                  {canManage ? (
                    <div className="mt-4">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div/>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {(['hobby', 'pro'] as const).map((plan) => {
                            const isThisPlanPending =
  isStorePending && pendingPurchase?.plan === plan
                            const isCurrent = currentPlan === plan
                            const isUpgrade =
                              currentPlan === 'hobby' && plan === 'pro'

                            const actionLabel = isCurrent
                              ? 'Renew plan'
                              : isUpgrade
                                ? 'Upgrade to Pro'
                                : currentPaidPlan
                                  ? `Switch to ${planLabel(plan)}`
                                  : `Choose ${planLabel(plan)}`

                            return (
                              <button
                                key={plan}
                                type="button"
                                disabled={isStorePending}
                                onClick={() =>
                                  handlePurchase(store.id, plan)
                                }
                                className={[
                                  'inline-flex min-h-11 items-center justify-between gap-4 rounded-xl border px-3.5 py-2.5 text-left text-sm font-medium transition-all',
                                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                                  'disabled:cursor-not-allowed disabled:opacity-60',
                                  plan === 'pro'
                                    ? 'border-primary bg-primary text-primary-foreground hover:bg-primary/90'
                                    : 'border-border bg-background text-foreground hover:bg-muted',
                                ].join(' ')}
                              >
                                <span className="flex items-center gap-2">
                                  {isThisPlanPending ? (
  <Loader2
    className="size-4 animate-spin"
    aria-hidden="true"
  />
) : isCurrent ? (
                                    <Check
                                      className="size-4"
                                      aria-hidden="true"
                                    />
                                  ) : plan === 'pro' ? (
                                    <Sparkles
                                      className="size-4"
                                      aria-hidden="true"
                                    />
                                  ) : (
                                    <CreditCard
                                      className="size-4"
                                      aria-hidden="true"
                                    />
                                  )}

                                  {isThisPlanPending
  ? 'Processing…'
  : actionLabel}
                                </span>

                                <span
                                  className={
                                    plan === 'pro'
                                      ? 'text-primary-foreground/80'
                                      : 'text-muted-foreground'
                                  }
                                >
                                  {formatKes(PLAN_PRICE_KES[plan])}/mo
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {error && (
                        <div
                          role="alert"
                          className="mt-4 flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-3.5 py-3 text-sm text-destructive"
                        >
                          <AlertCircle
                            className="mt-0.5 size-4 shrink-0"
                            aria-hidden="true"
                          />
                          <p>{error}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="border-t border-border bg-muted/20 px-5 py-3.5 text-sm text-muted-foreground sm:px-6">
                      You have view-only access to billing for this store.
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </section>
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
    </main>
  )
}