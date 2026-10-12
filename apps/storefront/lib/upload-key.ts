// Validation for object keys written through /api/upload. Keys are
// `<bucket>/<storeId>/<path…>/<file>`; the store id segment is what the route checks the
// caller's access against, so a user can only write inside stores they can manage.

export const UPLOAD_BUCKETS = ['store-assets', 'product-images'] as const
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const SEGMENT_RE = /^[A-Za-z0-9][A-Za-z0-9._() +-]{0,119}$/

export type ParsedUploadKey = { bucket: string; storeId: string; key: string }

/** Parse and validate an upload key, or return null. Never trusts the caller's path. */
export function parseUploadKey(raw: string | null): ParsedUploadKey | null {
    if (!raw || raw.length > 400) return null
    const parts = raw.split('/')
    if (parts.length < 3) return null // bucket / storeId / file at minimum
    const [bucket, storeId, ...rest] = parts
    if (!(UPLOAD_BUCKETS as readonly string[]).includes(bucket)) return null
    if (!UUID_RE.test(storeId)) return null
    for (const seg of rest) {
        if (seg === '.' || seg === '..' || seg.includes('..') || !SEGMENT_RE.test(seg)) return null
    }
    return { bucket, storeId: storeId.toLowerCase(), key: [bucket, storeId, ...rest].join('/') }
}

/** Only images, and only up to MAX_UPLOAD_BYTES (the client already enforces both; the server must too). */
export function checkUploadHeaders(contentType: string | null, contentLength: string | null):
    | { ok: true }
    | { ok: false; status: number; error: string } {
    const mime = (contentType ?? '').split(';')[0].trim().toLowerCase()
    // SVG can carry script, and these files are served from a public origin: raster only.
    if (!/^image\/[a-z0-9.+-]+$/.test(mime) || mime === 'image/svg+xml') {
        return { ok: false, status: 415, error: 'Only raster image uploads are allowed' }
    }
    const len = Number(contentLength)
    if (!contentLength || !Number.isFinite(len) || len <= 0) {
        return { ok: false, status: 411, error: 'Content-Length required' }
    }
    if (len > MAX_UPLOAD_BYTES) return { ok: false, status: 413, error: 'File too large (5 MB max)' }
    return { ok: true }
}
