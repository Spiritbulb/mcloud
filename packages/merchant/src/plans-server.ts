// apps/web/lib/plans-server.ts
// DB-backed plan resolvers. The pure decision logic lives in ./plans.ts and is
// unit-tested there; these wrappers just fetch the active subscription row.
import { createClient } from '@mcloud/db/server'
import {
  planHasFeature,
  resolvePlan,
  type FeatureKey,
  type Plan,
  type SubscriptionRow,
} from './plans'

/** The store's current tier: the best active, unexpired subscription (see resolvePlan). */
export async function getStorePlan(storeId: string): Promise<Plan> {
  return (await getStorePlans([storeId])).get(storeId) ?? 'free'
}

/** Tiers for many stores in one query. Stores with no subscription rows map to 'free'. */
export async function getStorePlans(storeIds: readonly string[]): Promise<Map<string, Plan>> {
  const plans = new Map<string, Plan>(storeIds.map((id) => [id, 'free']))
  if (storeIds.length === 0) return plans

  const supabase = await createClient()
  const { data } = await supabase
    .from('store_subscriptions')
    .select('store_id, plan, status, period_end')
    .in('store_id', [...storeIds])

  const byStore = new Map<string, SubscriptionRow[]>()
  for (const row of data ?? []) {
    const list = byStore.get(row.store_id) ?? []
    list.push(row)
    byStore.set(row.store_id, list)
  }
  for (const [id, rows] of byStore) plans.set(id, resolvePlan(rows))
  return plans
}

/** Whether the store's tier includes a given feature. */
export async function storeHasFeature(
  storeId: string,
  feature: FeatureKey,
): Promise<boolean> {
  const plan = await getStorePlan(storeId)
  return planHasFeature(plan, feature)
}
