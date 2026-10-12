// @route-kind: member
import { getSession } from '@mcloud/auth/server'
import { canManage, requireStoreAccessById } from '@mcloud/merchant/stores'
import { NextRequest } from 'next/server'
import { checkUploadHeaders, parseUploadKey } from '@/lib/upload-key'

// Streams a merchant upload to the R2 worker. Settings uploads (logos, product and
// gallery images) are the only caller, so unlike the old copy in apps/web this requires
// a signed-in session AND management access to the store named in the key: the storefront
// is publicly reachable on every custom domain, and the R2 bucket is shared by all stores.
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

  const res = await fetch(`${process.env.R2_WORKER_URL}/upload?key=${encodeURIComponent(parsed.key)}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${process.env.R2_AUTH_SECRET}`,
      'Content-Type': contentType!,
    },
    body: req.body,
    // @ts-expect-error - needed for streaming body in Node runtime
    duplex: 'half',
  })

  const text = await res.text()
  return new Response(text, {
    status: res.status,
    headers: { 'Content-Type': res.headers.get('Content-Type') || 'application/json' },
  })
}
