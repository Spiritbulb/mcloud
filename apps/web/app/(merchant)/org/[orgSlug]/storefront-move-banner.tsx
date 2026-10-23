'use client'

import { useSyncExternalStore } from 'react'
import { storefrontSiteUrl } from '@mcloud/merchant/storefront-url'
import { Icon } from '@mcloud/ui/kit/icon'

const DISMISS_KEY = 'mc_storefront_move_dismissed'

/**
 * Tells merchants storefronts are moving out of this dashboard. Dismissible per browser;
 * storage can be blocked, in which case the banner just stays visible.
 */
const listeners = new Set<() => void>()
let dismissedInSession = false

function isDismissed(): boolean {
    if (dismissedInSession) return true
    try {
        return localStorage.getItem(DISMISS_KEY) === '1'
    } catch {
        return false
    }
}

function subscribe(cb: () => void) {
    listeners.add(cb)
    return () => { listeners.delete(cb) }
}

function dismiss() {
    dismissedInSession = true
    try {
        localStorage.setItem(DISMISS_KEY, '1')
    } catch {}
    listeners.forEach((cb) => cb())
}

export function StorefrontMoveBanner() {
    // Server render and hydration assume "dismissed" so nothing flashes for people who closed it.
    const dismissed = useSyncExternalStore(subscribe, isDismissed, () => true)
    if (dismissed) return null

    return (
        <div
            role="status"
            className="shrink-0 flex items-center gap-3 px-4 md:px-6 py-2 text-[13px] bg-muted/50 text-foreground border-b border-border"
        >
            <Icon name="storefront" size={16} className="text-muted-foreground" />
            <p className="flex-1 min-w-0">
                Storefronts are moving to their own home. Your sites, links and orders are not affected.{' '}
                <a href={storefrontSiteUrl('/moving')} className="font-medium underline underline-offset-2">
                    See what&rsquo;s changing
                </a>
            </p>
            <button
                onClick={dismiss}
                aria-label="Dismiss"
                className="flex items-center justify-center w-7 h-7 rounded-md shrink-0 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
                <Icon name="close" size={16} />
            </button>
        </div>
    )
}
