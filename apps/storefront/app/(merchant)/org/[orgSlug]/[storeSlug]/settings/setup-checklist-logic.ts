// The Overview's "Get your store ready" checklist. Each step's done state is derived from the
// store's own data, never stored; only "hidden" and "link copied" live in
// stores.settings.setup_checklist. All the checklist copy is here so it can be edited in one place.
// Tested in setup-checklist-logic.test.ts.

import { helpPath } from '@/lib/help-links'

export type ChecklistState = { hidden?: boolean; link_shared?: boolean }

export type ChecklistInput = {
    productCount: number
    campaignCount: number
    paymentsEnabled: boolean
    deliveryZoneCount: number
    hasLogo: boolean
    orderCount: number
    customDomainSet: boolean
    linkShared: boolean
}

export type ChecklistStepId = 'product' | 'campaign' | 'payments' | 'delivery' | 'logo' | 'share' | 'domain'

export type ChecklistStep = {
    id: ChecklistStepId
    title: string
    description: string
    done: boolean
    /** Optional steps are shown but do not count toward progress. */
    optional: boolean
    /** Settings tab the step links to (the path after /settings/); null for the share step, which copies the link. */
    tab: string | null
    /** Docs page on web that explains the step. */
    docPath: string
}

const DONATIONS_GUIDE = '/docs/guides/collect-donations-online-for-your-ngo'
const SHOP_GUIDE = '/docs/guides/start-an-online-shop-in-kenya'

function doc(tab: string): string {
    const path = helpPath(tab)
    if (!path) throw new Error(`No doc for settings tab "${tab}"`)
    return path
}

export function checklistSteps(input: ChecklistInput, commerce: boolean): ChecklistStep[] {
    const payments: ChecklistStep = {
        id: 'payments',
        title: 'Set up payments',
        description: commerce
            ? 'Connect M-Pesa or PayPal so customers can pay you. Takes about 2 minutes.'
            : 'Connect M-Pesa or PayPal so supporters can give. Takes about 2 minutes.',
        done: input.paymentsEnabled,
        optional: false,
        tab: 'integrations/payments',
        docPath: doc('payments'),
    }
    const logo: ChecklistStep = {
        id: 'logo',
        title: 'Add your logo',
        description: 'Put your brand at the top of every page.',
        done: input.hasLogo,
        optional: false,
        tab: 'brand',
        docPath: doc('brand'),
    }
    const share: ChecklistStep = {
        id: 'share',
        title: 'Share your link',
        description: commerce
            ? 'Send your link on WhatsApp, Instagram or wherever your customers are.'
            : 'Send your link on WhatsApp, Instagram or wherever your supporters are.',
        done: input.orderCount > 0 || input.linkShared,
        optional: false,
        tab: null,
        docPath: commerce ? SHOP_GUIDE : DONATIONS_GUIDE,
    }

    if (commerce) {
        return [
            {
                id: 'product',
                title: 'Add a product',
                description: 'Give customers something to buy. A name, a price and a photo are enough.',
                done: input.productCount > 0,
                optional: false,
                tab: 'products',
                docPath: doc('products'),
            },
            payments,
            {
                id: 'delivery',
                title: 'Set delivery zones',
                description: 'Say where you deliver and what it costs.',
                done: input.deliveryZoneCount > 0,
                optional: false,
                tab: 'logistics',
                docPath: doc('logistics'),
            },
            logo,
            share,
        ]
    }

    return [
        {
            id: 'campaign',
            title: 'Add a campaign',
            description: "Tell supporters what you're raising money for and how much you need.",
            done: input.campaignCount > 0,
            optional: false,
            tab: 'content',
            docPath: DONATIONS_GUIDE,
        },
        payments,
        logo,
        share,
        {
            id: 'domain',
            title: 'Use your own domain',
            description: 'Give your site an address like yourname.org.',
            done: input.customDomainSet,
            optional: true,
            tab: 'domain',
            docPath: doc('domain'),
        },
    ]
}

export function checklistProgress(steps: ChecklistStep[]): { done: number; total: number; complete: boolean } {
    const counted = steps.filter((s) => !s.optional)
    const done = counted.filter((s) => s.done).length
    return { done, total: counted.length, complete: done === counted.length }
}

/** The stored checklist flags, reading only `true` booleans so stray values never hide it. */
export function readChecklistState(settings: unknown): ChecklistState {
    const raw = (settings as Record<string, unknown> | null)?.setup_checklist
    if (!raw || typeof raw !== 'object') return {}
    const r = raw as Record<string, unknown>
    const state: ChecklistState = {}
    if (r.hidden === true) state.hidden = true
    if (r.link_shared === true) state.link_shared = true
    return state
}

/** `settings` with `patch` merged into setup_checklist; every other key is kept. */
export function mergeChecklistState(settings: unknown, patch: ChecklistState): Record<string, unknown> {
    const base = settings && typeof settings === 'object' && !Array.isArray(settings) ? (settings as Record<string, unknown>) : {}
    return { ...base, setup_checklist: { ...readChecklistState(base), ...readChecklistState({ setup_checklist: patch }) } }
}

/** Screen-reader text for a step: its status, and link names that say which step they act on. */
export function stepLabels(step: ChecklistStep): { status: 'Done' | 'To do'; start: string; learn: string } {
    return {
        status: step.done ? 'Done' : 'To do',
        start: `Start: ${step.title}`,
        learn: `Learn how: ${step.title} (opens in a new tab)`,
    }
}

/** Runs a checklist save; resolves to an error message, or null when it saved. Never rejects. */
export async function runChecklistSave(save: () => Promise<{ ok: true } | { ok: false; error: string }>): Promise<string | null> {
    try {
        const res = await save()
        return res.ok ? null : res.error
    } catch {
        return 'Could not save. Check your connection and try again.'
    }
}
