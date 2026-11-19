// @route-kind: public — serves merchant-uploaded store images, which appear on public pages anyway
// GET /api/media/<bucket>/<storeId>/<path…>: an uploaded image from the private B2 bucket.
//
// TEMPORARY (2026-11) while the bucket cannot be made public; see lib/b2.ts. Objects never change
// (each upload gets a unique key), so responses are cached for a year by browsers and the CDN,
// and most views never reach this function.
//
// Only keys that /api/upload could have written (parseUploadKey) and only raster images are
// served. This is the settings app's origin, so the response is locked down: nosniff and a
// sandboxing CSP stop a file that is not really an image from running as a page.
import { NextRequest } from 'next/server'
import { b2Configured, getObject } from '@/lib/b2'
import { isServableImageType, parseUploadKey } from '@/lib/upload-key'

// next.config.ts sets the same CSP for /api/media (config headers win over a route's own).
const LOCKDOWN = {
  'X-Content-Type-Options': 'nosniff',
  'Content-Security-Policy': "default-src 'none'; sandbox; frame-ancestors 'self'",
}

function notFound() {
  return new Response('Not found', {
    status: 404,
    // Briefly: an object may appear moments after its URL is handed out.
    headers: { ...LOCKDOWN, 'Content-Type': 'text/plain', 'Cache-Control': 'public, max-age=60' },
  })
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ key: string[] }> }) {
  const { key: segments } = await params
  let raw: string
  try {
    raw = segments.map((s) => decodeURIComponent(s)).join('/')
  } catch {
    return notFound()
  }
  const parsed = parseUploadKey(raw)
  if (!parsed) return notFound()
  if (!b2Configured()) return new Response('Unavailable', { status: 503, headers: LOCKDOWN })

  let obj
  try {
    obj = await getObject(parsed.key)
  } catch (err) {
    const e = err as { name?: string; message?: string }
    console.error('[media] B2 get failed', e.name, e.message)
    return new Response('Unavailable', { status: 502, headers: { ...LOCKDOWN, 'Cache-Control': 'no-store' } })
  }
  if (!obj) return notFound()
  if (!isServableImageType(obj.contentType)) {
    await obj.body.cancel().catch(() => {})
    return notFound()
  }

  const headers: Record<string, string> = {
    ...LOCKDOWN,
    'Content-Type': obj.contentType!,
    'Content-Disposition': 'inline',
    'Cache-Control': 'public, max-age=31536000, immutable',
    'CDN-Cache-Control': 'public, max-age=31536000, immutable',
  }
  if (obj.bytes != null) headers['Content-Length'] = String(obj.bytes)
  if (obj.etag) headers.ETag = obj.etag
  return new Response(obj.body, { headers })
}
