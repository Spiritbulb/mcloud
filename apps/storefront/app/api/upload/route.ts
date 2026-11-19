// @route-kind: member
import { getSession } from '@mcloud/auth/server'
import { canManage, requireStoreAccessById } from '@mcloud/merchant/stores'
import { NextRequest } from 'next/server'
import { b2Configured, objectUrl, putObject } from '@/lib/b2'
import { checkUploadHeaders, MAX_UPLOAD_BYTES, parseUploadKey, uniqueUploadKey } from '@/lib/upload-key'

// Stores a merchant upload in the B2 bucket under a new, unique key. Settings uploads (logos, product and
// gallery images) are the only caller, so this requires a signed-in session AND management
// access to the store named in the key: the storefront is publicly reachable on every custom
// domain, and the bucket is shared by all stores. Responds { success, key, url }: callers save
// `url` (an /api/media link on this origin while the bucket is private; see lib/b2.ts).
export async function PUT(req: NextRequest) {
  const session = await getSession(req)
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const parsed = parseUploadKey(new URL(req.url).searchParams.get('key'))
  if (!parsed) return Response.json({ error: 'Invalid key' }, { status: 400 })

  const access = await requireStoreAccessById(parsed.storeId, session.user.id)
  if (access.error === 'not_found') return Response.json({ error: 'Store not found' }, { status: 404 })
  if (access.error || !canManage(access.role)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const contentType = req.headers.get('Content-Type')
  const headerCheck = checkUploadHeaders(contentType, req.headers.get('Content-Length'))
  if (!headerCheck.ok) return Response.json({ error: headerCheck.error }, { status: headerCheck.status })

  if (!b2Configured()) {
    console.error('[upload] B2 is not configured')
    return Response.json({ error: 'Uploads are unavailable right now' }, { status: 503 })
  }

  // At most 5 MB (checked above), so buffer it: B2 needs the exact length up front, and this
  // also enforces the limit on what actually arrived, not just on the header.
  const body = new Uint8Array(await req.arrayBuffer())
  if (body.byteLength === 0) return Response.json({ error: 'Empty file' }, { status: 400 })
  if (body.byteLength > MAX_UPLOAD_BYTES) return Response.json({ error: 'File too large (5 MB max)' }, { status: 413 })

  const key = uniqueUploadKey(parsed.key, crypto.randomUUID().slice(0, 8))
  try {
    await putObject(key, body, contentType!.split(';')[0].trim().toLowerCase())
    return Response.json({ success: true, key, url: objectUrl(new URL(req.url).origin, key) })
  } catch (err) {
    const e = err as { name?: string; message?: string }
    console.error('[upload] B2 put failed', e.name, e.message)
    return Response.json({ error: 'Upload failed. Try again.' }, { status: 502 })
  }
}
