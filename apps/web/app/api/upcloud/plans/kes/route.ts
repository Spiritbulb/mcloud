// apps/web/app/api/upcloud/plans/kes/route.ts
import { NextResponse } from 'next/server'
import { getSession } from '@mcloud/auth/server'
import { getEurToKesRate } from '../../../../../lib/exchange-rate'
import { getPlanEurPrice, applyMarkup } from '../../../../../lib/pricing-dc'

export async function GET() {
  const session = await getSession()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const rate = await getEurToKesRate()
    const prices: Record<string, number> = {}
    for (const [planName, eur] of Object.entries(
      // re-export PLAN_EUR_PRICE keys via the pricing module if you want
      // this to stay in one place — inlined here for clarity
      (await import('../../../../../lib/pricing-dc')).PLAN_EUR_PRICE,
    )) {
      const withMarkup = applyMarkup(eur)
      prices[planName] = Math.round(withMarkup * rate)
    }
    return NextResponse.json({ prices, rate })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to compute pricing' },
      { status: 502 },
    )
  }
}