// @route-kind: mobile
// POST /api/mobile/stores/[slug]/subscribe: RETIRED.
//
// Google Play billing was removed; plans are bought only through the org billing page
// (/org/{org}/billing, paid from the org wallet). This stub stays because app builds already
// in the field still call it after a Play purchase, and a clear 410 is better than a 404.
// Safe to delete once those builds are gone.
import { type NextRequest } from 'next/server'
import { fail, requireMobileUser } from '../../../_lib'

export async function POST(req: NextRequest) {
    const auth = await requireMobileUser(req)
    if (auth instanceof Response) return auth
    return fail(410, 'In-app subscriptions have been retired. Upgrade from Billing in your organisation on the web.')
}
