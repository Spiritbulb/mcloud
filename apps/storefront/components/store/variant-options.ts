// Variant options ("Size: M, Colour: Red") <-> the { Size: 'M', Colour: 'Red' } object the
// storefront builds its option pickers from. A variant with no options shows no pickers.

export type VariantOptions = Record<string, string>

const MAX_OPTIONS = 5
const MAX_LEN = 60

/** Parse "Size: M, Colour: Red" (also accepts "=") into options. Blank, half-filled and duplicate names are dropped. */
export function parseOptions(text: string): VariantOptions {
    const out: VariantOptions = {}
    for (const part of text.split(/[,;\n]/)) {
        const at = part.search(/[:=]/)
        if (at < 0) continue
        const key = part.slice(0, at).trim().slice(0, MAX_LEN)
        const value = part.slice(at + 1).trim().slice(0, MAX_LEN)
        if (!key || !value || key in out) continue
        if (Object.keys(out).length >= MAX_OPTIONS) break
        out[key] = value
    }
    return out
}

export function formatOptions(options: VariantOptions | null | undefined): string {
    return Object.entries(options ?? {}).map(([k, v]) => `${k}: ${v}`).join(', ')
}

/** Coerce whatever was stored (or sent by a client) into clean string options. */
export function sanitizeOptions(raw: unknown): VariantOptions {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
    const out: VariantOptions = {}
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
        const key = k.trim().slice(0, MAX_LEN)
        const value = typeof v === 'string' || typeof v === 'number' ? String(v).trim().slice(0, MAX_LEN) : ''
        if (!key || !value) continue
        if (Object.keys(out).length >= MAX_OPTIONS) break
        out[key] = value
    }
    return out
}

export function optionsEqual(a: VariantOptions, b: VariantOptions): boolean {
    const ak = Object.keys(a)
    return ak.length === Object.keys(b).length && ak.every((k) => a[k] === b[k])
}
