import test from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { verifySignature } from './signature'
import { parseInbound } from './inbound'
import { toGraphBody, LIMITS } from './payloads'
import { createGraphClient } from './graph'
import { generateLinkCode, formatLinkCode, hashLinkCode, parseLinkCommand } from './link-code'

const sign = (body: string, secret: string) => 'sha256=' + createHmac('sha256', secret).update(body).digest('hex')

test('verifySignature accepts the right signature and rejects everything else', () => {
    const body = '{"a":1}'
    assert.equal(verifySignature(body, sign(body, 's3'), 's3'), true)
    assert.equal(verifySignature(body, sign(body, 'other'), 's3'), false)
    assert.equal(verifySignature(body + ' ', sign(body, 's3'), 's3'), false)
    assert.equal(verifySignature(body, null, 's3'), false)
    assert.equal(verifySignature(body, 'sha256=zz', 's3'), false)
    assert.equal(verifySignature(body, 'md5=abc', 's3'), false)
    assert.equal(verifySignature(body, sign(body, 's3'), undefined), false, 'no secret fails closed')
    assert.equal(verifySignature(body, sign(body, ''), ''), false, 'empty secret fails closed')
})

const wrap = (messages: unknown[]) => ({ entry: [{ changes: [{ value: { messages } }] }] })

test('parseInbound reads text, list replies and button replies', () => {
    const got = parseInbound(wrap([
        { id: 'w1', from: '254700000001', type: 'text', text: { body: 'orders' } },
        { id: 'w2', from: '254700000001', type: 'interactive', interactive: { type: 'list_reply', list_reply: { id: 'store:shop', title: 'Shop' } } },
        { id: 'w3', from: '254700000001', type: 'interactive', interactive: { type: 'button_reply', button_reply: { id: 'b1', title: 'Yes' } } },
    ]))
    assert.deepEqual(got.map((m) => m.input), [
        { kind: 'text', text: 'orders' },
        { kind: 'reply', id: 'store:shop', title: 'Shop' },
        { kind: 'reply', id: 'b1', title: 'Yes' },
    ])
})

test('parseInbound marks media unsupported, ignores statuses and survives junk', () => {
    const got = parseInbound(wrap([{ id: 'w1', from: '1', type: 'image', image: {} }, { id: 'w2' }, null, 'x']))
    assert.equal(got.length, 1)
    assert.deepEqual(got[0].input, { kind: 'unsupported' })
    assert.deepEqual(parseInbound({ entry: [{ changes: [{ value: { statuses: [{ id: 'x' }] } }] }] }), [])
    for (const junk of [null, undefined, 5, 'x', [], {}, { entry: 'no' }, { entry: [{ changes: [null] }] }]) {
        assert.deepEqual(parseInbound(junk), [])
    }
})

test('toGraphBody enforces WhatsApp limits', () => {
    const long = 'x'.repeat(200)
    const body = toGraphBody('2547', {
        type: 'list', body: long.repeat(10), button: long,
        rows: Array.from({ length: 15 }, (_, i) => ({ id: `r${i}`, title: long, description: long })),
    }) as any
    const i = body.interactive
    assert.equal(body.to, '2547')
    assert.ok(i.body.text.length <= LIMITS.body)
    assert.ok(i.action.button.length <= LIMITS.button)
    assert.equal(i.action.sections[0].rows.length, LIMITS.rows)
    for (const r of i.action.sections[0].rows) {
        assert.ok(r.title.length <= LIMITS.rowTitle)
        assert.ok(r.description.length <= LIMITS.rowDescription)
    }
    const t = toGraphBody('2547', { type: 'text', body: 'hi' }) as any
    assert.deepEqual(t.text, { body: 'hi', preview_url: true })
})

test('graph client reports failure instead of throwing', async () => {
    const ok = createGraphClient({ token: 't', phoneNumberId: '9', fetchImpl: (async () => new Response('{}', { status: 200 })) as typeof fetch })
    assert.deepEqual(await ok.send('1', { type: 'text', body: 'x' }), { ok: true })
    const bad = createGraphClient({ token: 't', phoneNumberId: '9', fetchImpl: (async () => new Response('no', { status: 400 })) as typeof fetch })
    assert.deepEqual(await bad.send('1', { type: 'text', body: 'x' }), { ok: false })
    const boom = createGraphClient({ token: 't', phoneNumberId: '9', fetchImpl: (async () => { throw new Error('net') }) as typeof fetch })
    assert.deepEqual(await boom.send('1', { type: 'text', body: 'x' }), { ok: false })
})

test('graph client sends the bearer token to the phone number endpoint', async () => {
    let seen: { url: string; auth: string | null } | null = null
    const c = createGraphClient({
        token: 'tok', phoneNumberId: '555',
        fetchImpl: (async (url: string, init: RequestInit) => {
            seen = { url, auth: new Headers(init.headers).get('authorization') }
            return new Response('{}')
        }) as unknown as typeof fetch,
    })
    await c.send('1', { type: 'text', body: 'x' })
    assert.ok(seen!.url.endsWith('/555/messages'))
    assert.equal(seen!.auth, 'Bearer tok')
})

test('link codes: shape, hashing and command parsing', () => {
    for (let i = 0; i < 50; i++) assert.match(generateLinkCode(), /^\d{8}$/)
    assert.equal(formatLinkCode('12345678'), '1234 5678')
    assert.equal(hashLinkCode('1234 5678'), hashLinkCode('12345678'))
    assert.notEqual(hashLinkCode('12345678'), hashLinkCode('12345679'))
    assert.equal(parseLinkCommand('LINK 12345678'), '12345678')
    assert.equal(parseLinkCommand('  link 1234 5678 '), '12345678')
    assert.equal(parseLinkCommand('link 1234-5678'), '12345678')
    assert.equal(parseLinkCommand('link 1234567'), null)
    assert.equal(parseLinkCommand('link 123456789'), null)
    assert.equal(parseLinkCommand('link abc'), null)
    assert.equal(parseLinkCommand('please link 12345678'), null)
    assert.equal(parseLinkCommand('orders'), null)
})
