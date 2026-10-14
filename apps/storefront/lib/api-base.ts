import { webAppOrigin } from './host'

// Which origin a browser call goes to. Two kinds, kept apart because one env var used to serve both
// and could only be right for one of them (NEXT_PUBLIC_API_BASE_URL was an absolute storefront URL
// in production: custom-domain checkouts then made blocked cross-origin calls for zones and payment
// methods, and aimed payment calls at routes that only exist on web).

/**
 * The storefront's own API (`/api/store/[slug]/...`). Always same-origin: a store is served from the
 * platform host or a merchant's custom domain, and its API is on whichever one the page is on.
 * Pointing the browser at another origin needs CORS these routes deliberately do not send.
 */
export const STORE_API = '/api'

/**
 * The web app's API, for the payment providers (`/api/payments/...`), which only web serves and which
 * are registered with Safaricom and PayPal. Cross-origin by design: web allows CORS from storefront
 * origins, but without credentials, so these calls must not send cookies.
 */
export function webApi(): string {
    return `${webAppOrigin()}/api`
}
