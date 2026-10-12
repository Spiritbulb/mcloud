// What an anonymous shopper may learn about a store's payment integrations: just enough
// to render checkout (which methods are on, and the till/paybill to pay manually).
// An ALLOWLIST: a config field added later stays private until it is listed here.
const PUBLIC_FIELDS = [
    'enabled', 'darajaEnabled', 'paypalEnabled',
    'mpesa_type', 'mpesa_till', 'mpesa_paybill', 'mpesa_account',
] as const

export function publicIntegration(data: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
    if (!data) return null
    const out: Record<string, unknown> = {}
    for (const k of PUBLIC_FIELDS) if (k in data) out[k] = data[k]
    return out
}
