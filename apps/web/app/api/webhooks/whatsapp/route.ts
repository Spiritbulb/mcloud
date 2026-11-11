// @route-kind: webhook — Meta WhatsApp Cloud API; X-Hub-Signature-256 verified against the raw body, and every action runs as the user the sender's number is linked to
// apps/web/app/api/webhooks/whatsapp/route.ts
// GET  = Meta's one-off verification handshake when the webhook is registered.
// POST = inbound messages. Verify the signature, answer 200 straight away (Meta retries on anything
// else), and do the work in after(). Message ids are claimed first, so a retry never runs twice.
import { NextResponse, after, type NextRequest } from 'next/server'
import { createGraphClient, parseInbound, verifySignature } from '@mcloud/whatsapp'
import { getWhatsAppConfig } from '@/lib/whatsapp/config'
import { handleInbound, type Ports } from '@/lib/whatsapp/handle'
import { makeBotDeps } from '@/lib/whatsapp/deps'
import * as store from '@/lib/whatsapp/whatsapp-store'

export async function GET(req: NextRequest) {
    const cfg = getWhatsAppConfig()
    if (!cfg) return new NextResponse('WhatsApp is not configured', { status: 503 })
    const q = req.nextUrl.searchParams
    if (q.get('hub.mode') === 'subscribe' && q.get('hub.verify_token') === cfg.verifyToken) {
        return new NextResponse(q.get('hub.challenge') ?? '', { status: 200 })
    }
    return new NextResponse('Forbidden', { status: 403 })
}

export async function POST(req: NextRequest) {
    const cfg = getWhatsAppConfig()
    if (!cfg) return NextResponse.json({ error: 'not configured' }, { status: 503 })

    const raw = await req.text()
    if (!verifySignature(raw, req.headers.get('x-hub-signature-256'), cfg.appSecret)) {
        // Almost always a wrong WHATSAPP_APP_SECRET (it must be the app secret, not a token).
        console.warn('[whatsapp] webhook rejected: bad signature')
        return NextResponse.json({ error: 'bad signature' }, { status: 401 })
    }

    let payload: unknown
    try { payload = JSON.parse(raw) } catch { return NextResponse.json({ ok: true }) }

    const messages = parseInbound(payload)
    if (messages.length === 0) return NextResponse.json({ ok: true }) // delivery receipts and the like
    console.info(`[whatsapp] inbound: ${messages.length} message(s)`)

    const graph = createGraphClient({ token: cfg.token, phoneNumberId: cfg.phoneNumberId })
    const ports: Ports = {
        claimMessage: store.claimMessage,
        getLinkedUserId: store.getLinkedUserId,
        countFailedLinkAttempts: store.countFailedLinkAttempts,
        recordFailedLinkAttempt: store.recordFailedLinkAttempt,
        redeemLinkCode: store.redeemLinkCode,
        loadSession: store.loadSession,
        saveSession: store.saveSession,
        depsFor: makeBotDeps,
        send: (to, reply) => graph.send(to, reply),
        businessNumber: cfg.businessNumber,
    }

    after(async () => {
        for (const m of messages) await handleInbound(ports, m) // never throws; errors are answered inside
    })
    return NextResponse.json({ ok: true })
}
