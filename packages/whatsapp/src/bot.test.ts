import test from 'node:test'
import assert from 'node:assert/strict'
import { advance, resolve, parseState, IDLE, MENU, MAX_ROWS, cleanName, formatMoney, type BotState, type StoreOption, type OrderDetail } from './bot-logic'
import { runTurn, type BotDeps } from './bot'
import type { Reply } from './types'

const t = (text: string) => ({ kind: 'text', text }) as const
const r = (id: string) => ({ kind: 'reply', id, title: '' }) as const
const store = (n: number): StoreOption => ({ slug: `s${n}`, name: `Store ${n}`, orgName: 'Org' })

test('keywords and unknown text open the menu from idle; menu resets anywhere', () => {
    assert.deepEqual(advance(IDLE, t('hello')).replies, [MENU])
    assert.deepEqual(advance(IDLE, t('blah blah')).replies, [MENU])
    const mid: BotState = { step: 'ask_name', orgId: 'o1' }
    const out = advance(mid, t('MENU'))
    assert.deepEqual(out.state, IDLE)
    assert.deepEqual(out.replies, [MENU])
})

test('orders keyword and menu tap both ask for stores', () => {
    assert.deepEqual(advance(IDLE, t('Orders')).need, { kind: 'stores' })
    assert.deepEqual(advance(IDLE, r('menu:orders')).need, { kind: 'stores' })
    assert.deepEqual(advance(IDLE, t('new')).need, { kind: 'orgs' })
    assert.deepEqual(advance(IDLE, r('menu:new')).need, { kind: 'orgs' })
})

test('store list: none, one (skips picker), many, capped at 10 with a search hint', () => {
    const need = { kind: 'stores' } as const
    assert.match((resolve(IDLE, need, []).replies[0] as any).body, /do not have any stores/)
    const one = resolve(IDLE, need, [store(1)])
    assert.deepEqual(one.need, { kind: 'orders', storeSlug: 's1' })
    const many = resolve(IDLE, need, Array.from({ length: 14 }, (_, i) => store(i)))
    const list = many.replies[0] as Extract<Reply, { type: 'list' }>
    assert.equal(list.rows.length, MAX_ROWS)
    assert.match(list.body, /Showing 10 of 14/)
    assert.deepEqual(many.state, { step: 'pick_store' })
    assert.equal(list.rows[0].id, 'store:s0')
})

test('typing in pick_store searches; an empty search keeps the state', () => {
    const s: BotState = { step: 'pick_store' }
    assert.deepEqual(advance(s, t('crafts')).need, { kind: 'stores', query: 'crafts' })
    const none = resolve(s, { kind: 'stores', query: 'zzz' }, [])
    assert.deepEqual(none.state, s)
    assert.match((none.replies[0] as any).body, /No store matches "zzz"/)
})

test('orders: tapping a store fetches orders; list rows carry slug and number', () => {
    assert.deepEqual(advance(IDLE, r('store:shop')).need, { kind: 'orders', storeSlug: 'shop' })
    const out = resolve(IDLE, { kind: 'orders', storeSlug: 'shop' }, {
        ok: true, storeName: 'Shop',
        orders: [{ orderNumber: '1042', total: 2300, currency: 'KES', status: 'paid', createdAt: '2026-11-08T10:00:00Z' }],
    })
    const list = out.replies[0] as Extract<Reply, { type: 'list' }>
    assert.equal(list.rows[0].id, 'order:shop:1042')
    assert.equal(list.rows[0].title, '#1042')
    assert.match(list.rows[0].description!, /KES 2,300 · paid · 8 Nov/)
    assert.deepEqual(advance(IDLE, r('order:shop:1042')).need, { kind: 'order', storeSlug: 'shop', orderNumber: '1042' })
})

test('order ids may contain colons in the number; malformed ids fall back to the menu', () => {
    assert.deepEqual(advance(IDLE, r('order:shop:A:B')).need, { kind: 'order', storeSlug: 'shop', orderNumber: 'A:B' })
    for (const bad of ['order:', 'order:shop', 'order::5', 'store:', 'org:x', 'whatever']) {
        assert.deepEqual(advance(IDLE, r(bad)).replies, [MENU], bad)
    }
})

test('orders: empty and forbidden stores get a plain message', () => {
    const need = { kind: 'orders', storeSlug: 's' } as const
    assert.match((resolve(IDLE, need, { ok: true, storeName: 'Shop', orders: [] }).replies[0] as any).body, /Shop has no orders yet/)
    assert.match((resolve(IDLE, need, { ok: false }).replies[0] as any).body, /could not open that store/)
})

test('order detail shows items, totals and customer', () => {
    const o: OrderDetail = {
        orderNumber: '1042', total: 2300, currency: 'KES', status: 'paid', createdAt: null,
        fulfillmentStatus: null, customerPhone: '0712345678',
        items: [{ title: 'Basket', quantity: 2, price: 1150 }],
    }
    const body = (resolve(IDLE, { kind: 'order', storeSlug: 's', orderNumber: '1042' }, o).replies[0] as any).body as string
    assert.match(body, /Order #1042/)
    assert.match(body, /2 x Basket \(KES 1,150\)/)
    assert.match(body, /Total: KES 2,300/)
    assert.match(body, /Fulfilment: unfulfilled/)
    assert.match(body, /Customer: 0712345678/)
    assert.match((resolve(IDLE, { kind: 'order', storeSlug: 's', orderNumber: '1' }, null).replies[0] as any).body, /could not find/)
})

test('new store: no org, one org (asks the name), many orgs (picker)', () => {
    const need = { kind: 'orgs' } as const
    assert.match((resolve(IDLE, need, []).replies[0] as any).body, /owner or admin/)
    const one = resolve(IDLE, need, [{ id: 'o1', name: 'Acme' }])
    assert.deepEqual(one.state, { step: 'ask_name', orgId: 'o1' })
    const many = resolve(IDLE, need, [{ id: 'o1', name: 'Acme' }, { id: 'o2', name: 'Beta' }])
    assert.deepEqual(many.state, { step: 'pick_org' })
    const picked = advance({ step: 'pick_org' }, r('org:o2'))
    assert.deepEqual(picked.state, { step: 'ask_name', orgId: 'o2' })
    // an org tap outside the picker is ignored
    assert.deepEqual(advance(IDLE, r('org:o2')).replies, [MENU])
})

test('ask_name validates the name before creating', () => {
    const s: BotState = { step: 'ask_name', orgId: 'o1' }
    assert.equal(advance(s, t('a')).need, undefined)
    assert.deepEqual(advance(s, t('a')).state, s)
    assert.equal(advance(s, t('x'.repeat(61))).need, undefined)
    assert.deepEqual(advance(s, t('  Wanjiru   Crafts ')).need, { kind: 'create_store', orgId: 'o1', name: 'Wanjiru Crafts' })
})

test('create result: success shows the url, failure shows the reason and returns to idle', () => {
    const need = { kind: 'create_store', orgId: 'o1', name: 'X' } as const
    const ok = resolve({ step: 'ask_name', orgId: 'o1' }, need, { ok: true, name: 'Crafts', url: 'https://app.mcloud.co.ke/crafts' })
    assert.match((ok.replies[0] as any).body, /Crafts\* is created[\s\S]*https:\/\/app\.mcloud\.co\.ke\/crafts/)
    assert.deepEqual(ok.state, IDLE)
    const bad = resolve({ step: 'ask_name', orgId: 'o1' }, need, { ok: false, error: 'Only owners and admins can create stores' })
    assert.match((bad.replies[0] as any).body, /Only owners and admins/)
    assert.deepEqual(bad.state, IDLE)
})

test('copy has no em or en dashes', () => {
    const texts: string[] = []
    const grab = (rs: Reply[]) => rs.forEach((x) => texts.push(x.type === 'text' ? x.body : x.body + x.rows.map((q) => q.title + (q.description ?? '')).join()))
    grab([MENU])
    grab(advance(IDLE, t('help')).replies)
    grab(resolve(IDLE, { kind: 'orgs' }, []).replies)
    grab(resolve(IDLE, { kind: 'orders', storeSlug: 's' }, { ok: false }).replies)
    for (const x of texts) assert.doesNotMatch(x, /[—–]/)
})

test('helpers', () => {
    assert.equal(cleanName('  a   b \n c '), 'a b c')
    assert.equal(formatMoney(2300.5, 'KES'), 'KES 2,300.5')
    assert.equal(formatMoney(NaN, 'KES'), 'KES 0')
})

function fakeDeps(over: Partial<BotDeps> = {}): BotDeps & { calls: string[] } {
    const calls: string[] = []
    return {
        calls,
        stores: async (q) => { calls.push(`stores:${q ?? ''}`); return [store(1)] },
        orders: async (slug) => { calls.push(`orders:${slug}`); return { ok: true, storeName: 'Store 1', orders: [{ orderNumber: '7', total: 10, currency: 'KES', status: 'paid', createdAt: null }] } },
        order: async () => null,
        orgs: async () => [{ id: 'o1', name: 'Acme' }],
        createStore: async (orgId, name) => { calls.push(`create:${orgId}:${name}`); return { ok: true, name, url: `https://x/${name}` } },
        ...over,
    }
}

test('runTurn chains needs: orders with one store goes straight to the order list', async () => {
    const deps = fakeDeps()
    const out = await runTurn(deps, IDLE, t('orders'))
    assert.deepEqual(deps.calls, ['stores:', 'orders:s1'])
    assert.equal(out.replies.length, 1)
    assert.equal((out.replies[0] as any).rows[0].id, 'order:s1:7')
    assert.deepEqual(out.state, IDLE)
})

test('runTurn: full new store conversation across turns', async () => {
    const deps = fakeDeps()
    let turn = await runTurn(deps, IDLE, r('menu:new'))
    assert.deepEqual(turn.state, { step: 'ask_name', orgId: 'o1' })
    turn = await runTurn(deps, turn.state, t('Wanjiru Crafts'))
    assert.deepEqual(deps.calls, ['create:o1:Wanjiru Crafts'])
    assert.match((turn.replies[0] as any).body, /Wanjiru Crafts\* is created/)
    assert.deepEqual(turn.state, IDLE)
})

test('runTurn propagates dependency errors to the caller', async () => {
    const deps = fakeDeps({ stores: async () => { throw new Error('db down') } })
    await assert.rejects(() => runTurn(deps, IDLE, t('orders')), /db down/)
})

test('parseState accepts known states and falls back to idle for anything else', () => {
    assert.deepEqual(parseState({ step: 'pick_store' }), { step: 'pick_store' })
    assert.deepEqual(parseState({ step: 'pick_org' }), { step: 'pick_org' })
    assert.deepEqual(parseState({ step: 'ask_name', orgId: 'o1' }), { step: 'ask_name', orgId: 'o1' })
    for (const bad of [null, undefined, 3, 'x', [], {}, { step: 'ask_name' }, { step: 'ask_name', orgId: '' }, { step: 'hax' }]) {
        assert.deepEqual(parseState(bad), IDLE)
    }
})
