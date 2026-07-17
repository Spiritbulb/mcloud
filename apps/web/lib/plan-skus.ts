// Pure Google Play SKU -> plan mapping. Env plumbing lives in the route; this is
// the testable core so a mis-mapped SKU is caught by a unit test, not in prod.
import type { Plan } from './plans.ts'

export function planForSku(
  productId: string,
  skus: { hobby?: string; pro?: string },
): Plan | null {
  if (!productId) return null
  if (skus.hobby && productId === skus.hobby) return 'hobby'
  if (skus.pro && productId === skus.pro) return 'pro'
  return null
}
