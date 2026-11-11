import { advance, resolve, type BotState, type Need, type NeedResults, type OrgOption, type OrderDetail, type OrderSummary, type StoreOption } from './bot-logic'
import type { BotInput, Reply } from './types'

/** Everything the conversation needs from the outside world, for ONE already-identified user. */
export interface BotDeps {
    stores(query?: string): Promise<StoreOption[]>
    orders(storeSlug: string): Promise<{ ok: true; storeName: string; orders: OrderSummary[] } | { ok: false }>
    order(storeSlug: string, orderNumber: string): Promise<OrderDetail | null>
    orgs(): Promise<OrgOption[]>
    createStore(orgId: string, name: string): Promise<NeedResults['create_store']>
}

const MAX_HOPS = 5

async function fulfil(deps: BotDeps, need: Need): Promise<NeedResults[Need['kind']]> {
    switch (need.kind) {
        case 'stores': return deps.stores(need.query)
        case 'orders': return deps.orders(need.storeSlug)
        case 'order': return deps.order(need.storeSlug, need.orderNumber)
        case 'orgs': return deps.orgs()
        case 'create_store': return deps.createStore(need.orgId, need.name)
    }
}

/** Run one merchant message to completion: advance, fetch whatever data is needed, resolve. */
export async function runTurn(
    deps: BotDeps,
    state: BotState,
    input: BotInput,
): Promise<{ state: BotState; replies: Reply[] }> {
    let out = advance(state, input)
    const replies: Reply[] = [...out.replies]
    for (let hop = 0; out.need && hop < MAX_HOPS; hop++) {
        const need = out.need
        const result = await fulfil(deps, need)
        out = resolve(out.state, need, result)
        replies.push(...out.replies)
    }
    return { state: out.state, replies }
}
