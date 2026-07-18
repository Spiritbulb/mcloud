// Single source of truth for pricing tiers. Tier limits and feature flags are
// static config (versioned in code, not the DB). The decision helpers are pure
// so they are unit-testable without a database; DB-touching resolvers live in
// plans-server.ts and call planFromActiveRow.

export type Plan = 'free' | 'hobby' | 'pro'

export interface PlanFeatures {
  customDomain: boolean
  advancedAnalytics: boolean
  removeBranding: boolean
  blogPages: boolean
  prioritySupport: boolean
}

export type FeatureKey = keyof PlanFeatures

export interface PlanLimits {
  products: number
  members: number
  monthlyOrders: number
  features: PlanFeatures
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    products: 20,
    members: 1,
    monthlyOrders: 50,
    features: {
      customDomain: false,
      advancedAnalytics: false,
      removeBranding: false,
      blogPages: false,
      prioritySupport: false,
    },
  },
  hobby: {
    products: 200,
    members: 3,
    monthlyOrders: 500,
    features: {
      customDomain: true,
      advancedAnalytics: true,
      removeBranding: false,
      blogPages: true,
      prioritySupport: false,
    },
  },
  pro: {
    products: Infinity,
    members: 10,
    monthlyOrders: Infinity,
    features: {
      customDomain: true,
      advancedAnalytics: true,
      removeBranding: true,
      blogPages: true,
      prioritySupport: true,
    },
  },
}

const RANK: Record<Plan, number> = { free: 0, hobby: 1, pro: 2 }

/** Derive the tier from a store's most-recent-active subscription row. */
export function planFromActiveRow(
  row: { plan: string | null; status: string } | null | undefined,
): Plan {
  if (!row || row.status !== 'active') return 'free'
  if (row.plan === 'pro') return 'pro'
  if (row.plan === 'hobby') return 'hobby'
  return 'free'
}

/** True when a finite limit has been reached or exceeded. Infinity is never over. */
export function isOverLimit(count: number, limit: number): boolean {
  return Number.isFinite(limit) && count >= limit
}

export function planHasFeature(plan: Plan, feature: FeatureKey): boolean {
  return PLAN_LIMITS[plan].features[feature]
}

/** Whether `plan` satisfies a gate that requires at least `required`. */
export function planAllowsRequired(plan: Plan, required: 'hobby' | 'pro'): boolean {
  return RANK[plan] >= RANK[required]
}

/** User-facing over-limit message. No dashes (house copy rule). */
export function limitMessage(plan: Plan, noun: string, limit: number): string {
  return `You have reached your ${plan} plan limit of ${limit} ${noun}. Upgrade to add more.`
}
