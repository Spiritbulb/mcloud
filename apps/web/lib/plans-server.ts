// apps/web/lib/plans-server.ts
// DB-backed plan resolvers. The pure decision logic lives in ./plans.ts and is
// unit-tested there; these wrappers just fetch the active subscription row.
import { createClient } from '@mcloud/db/server'
import {
  planFromActiveRow,
  planHasFeature,
  type FeatureKey,
  type Plan,
} from './plans'

/** The store's current tier, derived from its most-recent subscription row. */
export async function getStorePlan(storeId: string): Promise<Plan> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('store_subscriptions')
    .select('plan, status')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return planFromActiveRow(data)
}

/** Whether the store's tier includes a given feature. */
export async function storeHasFeature(
  storeId: string,
  feature: FeatureKey,
): Promise<boolean> {
  const plan = await getStorePlan(storeId)
  return planHasFeature(plan, feature)
}
