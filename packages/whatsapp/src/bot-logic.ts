// The merchant bot's conversation as pure functions. `advance` reads what the merchant sent;
// `resolve` reads the data we fetched for them. Neither does I/O: when data is needed they return
// a `need`, and the driver (bot.ts) fulfils it. User-facing copy avoids dashes (house rule).
import type { BotInput, ListRow, Reply } from './types'

export type BotState =
    | { step: 'idle' }
    | { step: 'pick_store' }
    | { step: 'pick_org' }
    | { step: 'ask_name'; orgId: string }

export const IDLE: BotState = { step: 'idle' }

/** Read a state back from storage. Anything unrecognised becomes idle, never a crash. */
export function parseState(raw: unknown): BotState {
    if (typeof raw !== 'object' || raw === null) return IDLE
    const o = raw as Record<string, unknown>
    if (o.step === 'pick_store') return { step: 'pick_store' }
    if (o.step === 'pick_org') return { step: 'pick_org' }
    if (o.step === 'ask_name' && typeof o.orgId === 'string' && o.orgId) return { step: 'ask_name', orgId: o.orgId }
    return IDLE
}

export interface StoreOption { slug: string; name: string; orgName: string | null }
export interface OrgOption { id: string; name: string }
export interface OrderSummary {
    orderNumber: string
    total: number
    currency: string
    status: string
    createdAt: string | null
}
export interface OrderDetail extends OrderSummary {
    fulfillmentStatus: string | null
    customerPhone: string | null
    items: { title: string; quantity: number; price: number }[]
}

export type Need =
    | { kind: 'stores'; query?: string }
    | { kind: 'orders'; storeSlug: string }
    | { kind: 'order'; storeSlug: string; orderNumber: string }
    | { kind: 'orgs' }
    | { kind: 'create_store'; orgId: string; name: string }

export interface NeedResults {
    stores: StoreOption[]
    orders: { ok: true; storeName: string; orders: OrderSummary[] } | { ok: false }
    order: OrderDetail | null
    orgs: OrgOption[]
    create_store: { ok: true; name: string; url: string } | { ok: false; error: string }
}

export interface Out {
    state: BotState
    replies: Reply[]
    need?: Need
}

export const MAX_ROWS = 10
export const NAME_MIN = 2
export const NAME_MAX = 60

const text = (body: string): Reply => ({ type: 'text', body })

export const MENU: Reply = {
    type: 'list',
    body: 'What would you like to do?',
    button: 'Menu',
    rows: [
        { id: 'menu:orders', title: 'Orders', description: 'See recent orders for a store' },
        { id: 'menu:new', title: 'New store', description: 'Create a new storefront' },
        { id: 'menu:help', title: 'Help', description: 'How this works' },
    ],
}

export const HELP = text(
    'I can show you orders and create a new store.\n\nSend *orders* to see orders, *new* to create a store, or *menu* at any time to start again. Editing a store, its products and its look is done in the Menengai app or on mcloud.co.ke.',
)

export const NOT_LINKED = (businessNumber?: string) =>
    text(
        `This number is not linked to a Menengai account yet.\n\nOn mcloud.co.ke open your organization settings, choose WhatsApp, and send the code it shows you here as: LINK 12345678` +
            (businessNumber ? `\n\n(${businessNumber})` : ''),
    )

export const GENERIC_ERROR = text('Something went wrong. Send *menu* to start again.')
export const UNSUPPORTED = text('I can only read text and taps for now. Send *menu* to see what I can do.')

// ── Formatting ────────────────────────────────────────────────────────────────

export function formatMoney(amount: number, currency: string): string {
    const n = Number.isFinite(amount) ? amount : 0
    return `${currency} ${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
}

export function formatShortDate(iso: string | null): string {
    if (!iso) return ''
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'Africa/Nairobi' })
}

/** Collapse whitespace; the store name as it will be saved. */
export function cleanName(raw: string): string {
    return raw.replace(/\s+/g, ' ').trim()
}

// ── Transitions ───────────────────────────────────────────────────────────────

const KEYWORDS: Record<string, 'menu' | 'orders' | 'new' | 'help'> = {
    menu: 'menu', hi: 'menu', hello: 'menu', start: 'menu',
    orders: 'orders', order: 'orders',
    new: 'new', 'new store': 'new',
    help: 'help',
}

function startOrders(): Out {
    return { state: { step: 'pick_store' }, replies: [], need: { kind: 'stores' } }
}
function startNew(): Out {
    return { state: IDLE, replies: [], need: { kind: 'orgs' } }
}
const menu = (): Out => ({ state: IDLE, replies: [MENU] })

/** Read one message from the merchant. Ids from list rows are only lookup keys: the driver's
 *  data fetches re-check access for the linked user, so a forged id cannot reach a foreign store. */
export function advance(state: BotState, input: BotInput): Out {
    if (input.kind === 'reply') return advanceReply(state, input.id)

    const raw = input.text.trim()
    const keyword = KEYWORDS[raw.toLowerCase()]
    if (keyword === 'menu') return menu()
    if (keyword === 'orders') return startOrders()
    if (keyword === 'new') return startNew()
    if (keyword === 'help') return { state: IDLE, replies: [HELP] }

    if (state.step === 'ask_name') {
        const name = cleanName(raw)
        if (name.length < NAME_MIN || name.length > NAME_MAX) {
            return { state, replies: [text(`Please send a store name between ${NAME_MIN} and ${NAME_MAX} characters, or *menu* to cancel.`)] }
        }
        return { state, replies: [], need: { kind: 'create_store', orgId: state.orgId, name } }
    }
    if (state.step === 'pick_store' && raw) {
        return { state, replies: [], need: { kind: 'stores', query: raw } }
    }
    return menu()
}

function advanceReply(state: BotState, id: string): Out {
    if (id === 'menu:orders') return startOrders()
    if (id === 'menu:new') return startNew()
    if (id === 'menu:help') return { state: IDLE, replies: [HELP] }

    if (id.startsWith('store:')) {
        const storeSlug = id.slice('store:'.length)
        return storeSlug ? { state: IDLE, replies: [], need: { kind: 'orders', storeSlug } } : menu()
    }
    if (id.startsWith('order:')) {
        const rest = id.slice('order:'.length)
        const cut = rest.indexOf(':')
        const storeSlug = rest.slice(0, cut)
        const orderNumber = rest.slice(cut + 1)
        return cut > 0 && orderNumber
            ? { state: IDLE, replies: [], need: { kind: 'order', storeSlug, orderNumber } }
            : menu()
    }
    if (id.startsWith('org:') && state.step === 'pick_org') {
        const orgId = id.slice('org:'.length)
        return orgId ? askName(orgId) : menu()
    }
    return menu()
}

const askName = (orgId: string): Out => ({
    state: { step: 'ask_name', orgId },
    replies: [text('What should your new store be called? Send the name, or *menu* to cancel.')],
})

/** Read the data we fetched for a `need`. May return a further `need`. */
export function resolve(state: BotState, need: Need, result: NeedResults[Need['kind']]): Out {
    // The driver pairs each need with its own result type (see NeedResults); the casts record that.
    switch (need.kind) {
        case 'stores':
            return resolveStores(state, need, result as NeedResults['stores'])
        case 'orders':
            return resolveOrders(need, result as NeedResults['orders'])
        case 'order':
            return resolveOrder(result as NeedResults['order'])
        case 'orgs':
            return resolveOrgs(result as NeedResults['orgs'])
        case 'create_store':
            return resolveCreate(result as NeedResults['create_store'])
    }
}

function resolveStores(state: BotState, need: Extract<Need, { kind: 'stores' }>, stores: StoreOption[]): Out {
    if (stores.length === 0) {
        if (need.query) {
            return { state, replies: [text(`No store matches "${need.query}". Try part of the name again, or send *menu*.`)] }
        }
        return { state: IDLE, replies: [text('You do not have any stores yet. Send *new* to create one.')] }
    }
    if (stores.length === 1) {
        return { state: IDLE, replies: [], need: { kind: 'orders', storeSlug: stores[0].slug } }
    }
    const rows: ListRow[] = stores.slice(0, MAX_ROWS).map((s) => ({
        id: `store:${s.slug}`,
        title: s.name,
        ...(s.orgName ? { description: s.orgName } : {}),
    }))
    const more = stores.length > MAX_ROWS
    const body = more
        ? `Showing ${MAX_ROWS} of ${stores.length} stores. Pick one, or type part of a store name to narrow it down.`
        : 'Which store?'
    return { state: { step: 'pick_store' }, replies: [{ type: 'list', body, button: 'Choose store', rows }] }
}

function resolveOrders(need: Extract<Need, { kind: 'orders' }>, r: NeedResults['orders']): Out {
    if (!r.ok) return { state: IDLE, replies: [text('I could not open that store. Send *orders* to pick another.')] }
    if (r.orders.length === 0) return { state: IDLE, replies: [text(`${r.storeName} has no orders yet.`)] }
    const rows: ListRow[] = r.orders.slice(0, MAX_ROWS).map((o) => ({
        id: `order:${need.storeSlug}:${o.orderNumber}`,
        title: `#${o.orderNumber}`,
        description: [formatMoney(o.total, o.currency), o.status, formatShortDate(o.createdAt)].filter(Boolean).join(' · '),
    }))
    return {
        state: IDLE,
        replies: [{ type: 'list', body: `Latest orders for ${r.storeName}. Tap one for details.`, button: 'View orders', rows }],
    }
}

function resolveOrder(o: NeedResults['order']): Out {
    if (!o) return { state: IDLE, replies: [text('I could not find that order. Send *orders* to look again.')] }
    const lines = o.items.length
        ? o.items.map((i) => `${i.quantity} x ${i.title} (${formatMoney(i.price, o.currency)})`).join('\n')
        : 'No items listed'
    const body = [
        `*Order #${o.orderNumber}*`,
        formatShortDate(o.createdAt),
        '',
        lines,
        '',
        `Total: ${formatMoney(o.total, o.currency)}`,
        `Payment: ${o.status}`,
        `Fulfilment: ${o.fulfillmentStatus ?? 'unfulfilled'}`,
        o.customerPhone ? `Customer: ${o.customerPhone}` : '',
    ].filter((l, i, a) => l !== '' || (i > 0 && a[i - 1] !== '')).join('\n')
    return { state: IDLE, replies: [text(body)] }
}

function resolveOrgs(orgs: OrgOption[]): Out {
    if (orgs.length === 0) {
        return {
            state: IDLE,
            replies: [text('You need to be an owner or admin of an organization to create a store. You can set one up on mcloud.co.ke.')],
        }
    }
    if (orgs.length === 1) return askName(orgs[0].id)
    const rows: ListRow[] = orgs.slice(0, MAX_ROWS).map((o) => ({ id: `org:${o.id}`, title: o.name }))
    return {
        state: { step: 'pick_org' },
        replies: [{ type: 'list', body: 'Which organization is the new store for?', button: 'Choose', rows }],
    }
}

function resolveCreate(r: NeedResults['create_store']): Out {
    if (!r.ok) return { state: IDLE, replies: [text(`I could not create the store: ${r.error}\n\nSend *new* to try again.`)] }
    return {
        state: IDLE,
        replies: [text(`*${r.name}* is created.\n\n${r.url}\n\nOpen the Menengai app or mcloud.co.ke to add products and finish setting it up.`)],
    }
}
