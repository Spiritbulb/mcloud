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

/**
 * The public URL of an uploaded object. `base` is B2_PUBLIC_URL when set (a CDN or the bucket's
 * friendly URL), otherwise the bucket's S3 path-style URL, which B2 serves to anyone for a
 * public bucket. Each key segment is encoded: file names keep spaces and brackets.
 */
export function publicObjectUrl(base: string, key: string): string {
    return `${base.replace(/\/+$/, '')}/${key.split('/').map(encodeURIComponent).join('/')}`
}

/**
 * `key` with `tag` in front of its file name (`…/products/<tag>-photo.jpg`), so every upload is a
 * new object: an object never changes once written, which lets /api/media cache it for good, and a
 * second `photo.jpg` cannot replace one a live page still shows. The name is shortened from the
 * front if needed to stay a valid segment, keeping the extension.
 */
export function uniqueUploadKey(key: string, tag: string): string {
    const parts = key.split('/')
    const file = parts.pop()!
    const room = 120 - tag.length - 1
    parts.push(`${tag}-${file.length > room ? file.slice(file.length - room).replace(/^[^A-Za-z0-9]+/, '') : file}`)
    return parts.join('/')
}

/** Content types /api/media will serve: what checkUploadHeaders let in (raster images, no SVG). */
export function isServableImageType(contentType: string | null | undefined): boolean {
    const mime = (contentType ?? '').split(';')[0].trim().toLowerCase()
    return /^image\/[a-z0-9.+-]+$/.test(mime) && mime !== 'image/svg+xml'
}
