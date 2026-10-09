import { getSession } from '@mcloud/auth/server'
import { NextRequest } from 'next/server'

// Streams a merchant upload to the R2 worker. Settings uploads (logos, product and
// gallery images) are the only caller, so unlike the copy in apps/web this requires
// a signed-in session: the storefront is publicly reachable on every custom domain.
export async function PUT(req: NextRequest) {
  const session = await getSession(req)
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const key = new URL(req.url).searchParams.get('key')
  if (!key) return Response.json({ error: 'Missing key' }, { status: 400 })

  const res = await fetch(`${process.env.R2_WORKER_URL}/upload?key=${encodeURIComponent(key)}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${process.env.R2_AUTH_SECRET}`,
      'Content-Type': req.headers.get('Content-Type') || 'application/octet-stream',
    },
    body: req.body,
    // @ts-ignore - needed for streaming body in Node runtime
    duplex: 'half',
  })

  const text = await res.text()
  return new Response(text, {
    status: res.status,
    headers: { 'Content-Type': res.headers.get('Content-Type') || 'application/json' },
  })
}
