// Browser-side GA helpers. Safe to import from any client component; every function is a no-op
// on the server. The rules live in analytics-logic.ts; the component that wires them to the
// router is components/google-analytics.tsx.
import { CONSENT_KEY, LINKER_DOMAINS, parseConsent, type ConsentChoice } from './analytics-logic'

/**
 * gtag is "push the arguments object onto dataLayer". Defining it ourselves (instead of waiting for
 * the script) means calls made before gtag.js has loaded are queued, in order, and replayed. It must
 * push `arguments`, not an array: gtag.js ignores plain arrays.
 */
function ensureGtag(): void {
    window.dataLayer = window.dataLayer || []
    if (!window.gtag) {
        window.gtag = function () {
            // eslint-disable-next-line prefer-rest-params
            window.dataLayer.push(arguments)
        }
    }
}

function readStored(): string | null {
    try {
        return localStorage.getItem(CONSENT_KEY)
    } catch {
        return null // private mode / blocked storage: fall back to the default
    }
}

let started = false

/** Queue consent defaults, then the property config. Idempotent; call before the first page_view. */
export function startAnalytics(id: string): void {
    if (typeof window === 'undefined' || started) return
    started = true
    ensureGtag()
    // Consent default MUST be queued before config. Ads signals stay off: we run no ads.
    window.gtag('consent', 'default', {
        analytics_storage: parseConsent(readStored()),
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
    })
    window.gtag('js', new Date())
    // send_page_view:false because the component reports each view itself, with a sanitised URL.
    // (GA4's own "page changes based on browser history events" must be OFF in the property, or it
    // reports every route change a second time with the raw URL.)
    window.gtag('config', id, { send_page_view: false, linker: { domains: LINKER_DOMAINS } })
}

export function pageView(path: string, location: string): void {
    if (typeof window === 'undefined') return
    ensureGtag()
    window.gtag('event', 'page_view', { page_path: path, page_location: location, page_title: document.title })
}

/** Custom event, e.g. track('sign_up', { method: 'email' }). Never put personal data in params. */
export function track(name: string, params?: Record<string, unknown>): void {
    if (typeof window === 'undefined') return
    ensureGtag()
    window.gtag('event', name, params ?? {})
}

/** Record the visitor's choice and tell GA immediately. */
export function setAnalyticsConsent(choice: ConsentChoice): void {
    if (typeof window === 'undefined') return
    try {
        localStorage.setItem(CONSENT_KEY, choice === 'granted' ? 'accepted' : 'declined')
    } catch {
        /* storage blocked: the choice still applies to this page view */
    }
    ensureGtag()
    window.gtag('consent', 'update', { analytics_storage: choice })
}

/** True once the visitor has seen the banner and answered (or the legacy "I understand" was stored). */
export function hasAnsweredConsent(): boolean {
    return readStored() !== null
}
