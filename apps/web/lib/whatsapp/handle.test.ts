import test from 'node:test'
import assert from 'node:assert/strict'
import { hashLinkCode, IDLE, type BotDeps, type BotState, type Inbound, type Reply } from '@mcloud/whatsapp'
import { handleInbound, MAX_FAILED_LINK_ATTEMPTS, type Ports } from './handle'

function world() {
    const seen = new Set<string>()
    const links = new Map<string, string>() // waId -> userId
    const codes = new Map<string, string>() // hash -> userId
    const failed: string[] = []
    const sessions = new Map<string, BotState>()
    const sent: { to: string; reply: Reply }[] = []
    const created: string[] = []
    let crash = false
    const deps: BotDeps = {
        stores: async () => [{ slug: 'shop', name: 'Shop', orgName: 'Acme' }],
        orders: async () => ({ ok: true, storeName: 'Shop', orders: [{ orderNumber: '7', total: 100, currency: 'KES', status: 'paid', createdAt: null }] }),
        order: async () => null,
        orgs: async () => [{ id: 'o1', name: 'Acme' }],
        createStore: async (orgId, name) => { if (crash) throw new Error('db down'); created.push(`${orgId}:${name}`); return { ok: true, name, url: 'https://x/y' } },
    }
    const usersSeen: string[] = []
    const ports: Ports = {
        claimMessage: async (id) => (seen.has(id) ? false : (seen.add(id), true)),
        getLinkedUserId: async (wa) => links.get(wa) ?? null,
        countFailedLinkAttempts: async (wa) => failed.filter((w) => w === wa).length,
        recordFailedLinkAttempt: async (wa) => { failed.push(wa) },
        redeemLinkCode: async (hash, wa) => {
            const u = codes.get(hash)
            if (!u) return { ok: false, code: 'bad_code' }
            codes.delete(hash)
            links.set(wa, u)
            return { ok: true, userId: u }
        },
        loadSession: async (wa) => sessions.get(wa) ?? IDLE,
        saveSession: async (wa, s) => { sessions.set(wa, s) },
        depsFor: (u) => { usersSeen.push(u); return deps },
        send: async (to, reply) => { sent.push({ to, reply }) },
        businessNumber: '+254700000000',
    }
    let n = 0
    const say = (from: string, input: Inbound['input'], id?: string) => handleInbound(ports, { id: id ?? `m${++n}`, from, input })
    const bodies = () => sent.map((s) => (s.reply.type === 'text' ? s.reply.body : s.reply.body))
    return { ports, links, codes, failed, sessions, sent, created, say, bodies, usersSeen, setCrash: (v: boolean) => { crash = v } }
}

const t = (text: string) => ({ kind: 'text', text }) as const

test('an unlinked number is told how to link and nothing else happens', async () => {
    const w = world()
    await w.say('254700', t('orders'))
    assert.equal(w.sent.length, 1)
    assert.match(w.bodies()[0], /not linked/)
    assert.match(w.bodies()[0], /\+254700000000/)
    assert.equal(w.usersSeen.length, 0)
})

test('LINK with a valid code links the number as that user', async () => {
    const w = world()
    w.codes.set(hashLinkCode('12345678'), 'user_1')
    await w.say('254700', t('LINK 1234 5678'))
    assert.match(w.bodies()[0], /Linked/)
    assert.equal(w.links.get('254700'), 'user_1')
    await w.say('254700', t('orders'))
    assert.deepEqual(w.usersSeen, ['user_1'])
})

test('a wrong code is refused, counted, and blocked after the limit', async () => {
    const w = world()
    for (let i = 0; i < MAX_FAILED_LINK_ATTEMPTS; i++) await w.say('254700', t('LINK 00000000'))
    assert.equal(w.failed.length, MAX_FAILED_LINK_ATTEMPTS)
    w.codes.set(hashLinkCode('12345678'), 'user_1')
    await w.say('254700', t('LINK 12345678'))
    assert.match(w.bodies().at(-1)!, /Too many tries/)
    assert.equal(w.links.has('254700'), false, 'even a correct code is refused while blocked')
    // another number is unaffected
    await w.say('254711', t('LINK 12345678'))
    assert.equal(w.links.get('254711'), 'user_1')
})

test('a malformed LINK command explains the format and is not counted', async () => {
    const w = world()
    await w.say('254700', t('link 123'))
    assert.match(w.bodies()[0], /8 digit code/)
    assert.equal(w.failed.length, 0)
})

test('a linked merchant creates a store end to end', async () => {
    const w = world()
    w.links.set('254700', 'user_1')
    await w.say('254700', t('new'))
    assert.match(w.bodies().at(-1)!, /What should your new store be called/)
    await w.say('254700', t('Wanjiru Crafts'))
    assert.deepEqual(w.created, ['o1:Wanjiru Crafts'])
    assert.match(w.bodies().at(-1)!, /Wanjiru Crafts\* is created/)
    assert.deepEqual(w.sessions.get('254700'), IDLE)
})

test('a linked merchant lists orders', async () => {
    const w = world()
    w.links.set('254700', 'user_1')
    await w.say('254700', t('orders'))
    const last = w.sent.at(-1)!.reply
    assert.equal(last.type, 'list')
    assert.equal(last.type === 'list' ? last.rows[0].id : null, 'order:shop:7')
})

test('a retried message id is processed once', async () => {
    const w = world()
    w.links.set('254700', 'user_1')
    await w.say('254700', t('menu'), 'same')
    await w.say('254700', t('menu'), 'same')
    assert.equal(w.sent.length, 1)
})

test('unsupported messages get a polite reply once linked', async () => {
    const w = world()
    w.links.set('254700', 'user_1')
    await w.say('254700', { kind: 'unsupported' })
    assert.match(w.bodies()[0], /only read text/)
})

test('a crash mid conversation sends a generic error and resets to the menu state', async () => {
    const w = world()
    w.links.set('254700', 'user_1')
    await w.say('254700', t('new'))
    w.setCrash(true)
    await w.say('254700', t('Some Shop'))
    assert.match(w.bodies().at(-1)!, /Something went wrong/)
    assert.deepEqual(w.sessions.get('254700'), IDLE)
})

test('a sender is only ever acted for as the user their own number is linked to', async () => {
    const w = world()
    w.links.set('254700', 'user_A')
    w.links.set('254711', 'user_B')
    await w.say('254700', t('orders'))
    await w.say('254711', t('orders'))
    assert.deepEqual(w.usersSeen, ['user_A', 'user_B'])
})
