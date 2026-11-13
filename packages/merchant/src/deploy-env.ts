/**
 * Which deployment this build is. `NEXT_PUBLIC_DEPLOY_ENV=staging` marks the staging server
 * (staging.mcloud.co.ke); anything else, including unset, is production. Inlined at build.
 * Client-safe: reads only NEXT_PUBLIC_* config.
 */

/** The callback URL registered for live M-PESA; production always uses it. */
const PRODUCTION_MPESA_CALLBACK = 'https://mcloud.co.ke/api/payments/mpesa/callback'

export function isStaging(value: string | undefined = process.env.NEXT_PUBLIC_DEPLOY_ENV): boolean {
    return value === 'staging'
}

/**
 * Daraja STK `CallBackURL`. On staging it is the web app's own origin, so a payment made there
 * reports back to staging rather than production. Everywhere else it stays the production URL
 * (production's configured origin is www., and the callback host must not change silently).
 */
export function mpesaCallbackUrl(
    origin: string | null | undefined,
    deployEnv: string | undefined = process.env.NEXT_PUBLIC_DEPLOY_ENV,
): string {
    if (!isStaging(deployEnv) || !origin) return PRODUCTION_MPESA_CALLBACK
    try {
        return `${new URL(origin).origin}/api/payments/mpesa/callback`
    } catch {
        return PRODUCTION_MPESA_CALLBACK
    }
}
