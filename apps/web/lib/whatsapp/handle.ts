// One inbound WhatsApp message, start to finish. All I/O comes in through `Ports`, so the whole
// flow (dedupe, linking, rate limit, conversation, errors) is tested with in-memory fakes.
import {
    GENERIC_ERROR, IDLE, NOT_LINKED, UNSUPPORTED,
    hashLinkCode, parseLinkCommand, runTurn,
    type BotDeps, type BotState, type Inbound, type Reply,
} from '@mcloud/whatsapp'

export const MAX_FAILED_LINK_ATTEMPTS = 5
export const ATTEMPT_WINDOW_MS = 60 * 60 * 1000

export interface Ports {
    /** True the first time a Meta message id is seen, false for a retry. */
    claimMessage(id: string): Promise<boolean>
    getLinkedUserId(waId: string): Promise<string | null>
    countFailedLinkAttempts(waId: string, sinceMs: number): Promise<number>
    recordFailedLinkAttempt(waId: string): Promise<void>
    redeemLinkCode(codeHash: string, waId: string): Promise<{ ok: true; userId: string } | { ok: false; code: 'bad_code' | 'number_in_use' }>
    loadSession(waId: string): Promise<BotState>
    saveSession(waId: string, state: BotState): Promise<void>
    depsFor(userId: string): BotDeps
    send(to: string, reply: Reply): Promise<unknown>
    businessNumber: string | null
}

const text = (body: string): Reply => ({ type: 'text', body })

export async function handleInbound(ports: Ports, msg: Inbound): Promise<void> {
    const reply = async (...rs: Reply[]) => { for (const r of rs) await ports.send(msg.from, r) }

    try {
        if (!(await ports.claimMessage(msg.id))) return

        if (msg.input.kind === 'text') {
            const code = parseLinkCommand(msg.input.text)
            if (code) return await handleLink(ports, msg.from, code, reply)
            if (/^\s*link\b/i.test(msg.input.text)) {
                return await reply(text('To link this number, send LINK followed by the 8 digit code from your organization settings on mcloud.co.ke.'))
            }
        }

        const userId = await ports.getLinkedUserId(msg.from)
        if (!userId) return await reply(NOT_LINKED(ports.businessNumber ?? undefined))
        if (msg.input.kind === 'unsupported') return await reply(UNSUPPORTED)

        const state = await ports.loadSession(msg.from)
        const turn = await runTurn(ports.depsFor(userId), state, msg.input)
        await ports.saveSession(msg.from, turn.state)
        await reply(...turn.replies)
    } catch (e) {
        console.error('[whatsapp] handling failed', e)
        try {
            await ports.saveSession(msg.from, IDLE)
            await ports.send(msg.from, GENERIC_ERROR)
        } catch (inner) {
            console.error('[whatsapp] error reply failed', inner)
        }
    }
}

async function handleLink(ports: Ports, waId: string, code: string, reply: (...r: Reply[]) => Promise<void>) {
    if ((await ports.countFailedLinkAttempts(waId, ATTEMPT_WINDOW_MS)) >= MAX_FAILED_LINK_ATTEMPTS) {
        return reply(text('Too many tries. Please wait an hour, then generate a new code in your organization settings.'))
    }
    const res = await ports.redeemLinkCode(hashLinkCode(code), waId)
    if (res.ok) {
        await ports.saveSession(waId, IDLE)
        return reply(text('Linked. Send *menu* to see what I can do.'))
    }
    if (res.code === 'number_in_use') {
        return reply(text('This number is already linked to another account. Disconnect it there first, then try again.'))
    }
    await ports.recordFailedLinkAttempt(waId)
    return reply(text('That code did not work. It may have expired or been used already. Generate a new one in your organization settings and try again.'))
}
