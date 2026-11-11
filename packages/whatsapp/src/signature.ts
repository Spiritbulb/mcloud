import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Verify Meta's `X-Hub-Signature-256` header (`sha256=<hex>`) against the RAW request body.
 * Fails closed: a missing secret, a missing or malformed header, or a length mismatch is false.
 */
export function verifySignature(
    rawBody: string,
    header: string | null | undefined,
    secret: string | undefined,
): boolean {
    if (!secret || !header || !header.startsWith('sha256=')) return false
    const expected = createHmac('sha256', secret).update(rawBody, 'utf8').digest()
    const given = Buffer.from(header.slice('sha256='.length), 'hex')
    return given.length === expected.length && timingSafeEqual(given, expected)
}
