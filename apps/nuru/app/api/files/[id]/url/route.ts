// @route-kind: user
// GET /api/files/:id/url -> { url } | { error }
// A presigned GET (3600 s) for the viewer. The web page gets its first URL from the server and fetches
// this at most once, after the PDF fails to load. Mobile fetches it directly.
import { NextResponse, type NextRequest } from 'next/server'
import { presignGet } from '@/lib/files/b2'
import { getFile } from '@/lib/files/queries'
import { isFileId } from '@/lib/files/upload-logic'
import { requireUser } from '@/lib/session'

const NO_STORE = { 'Cache-Control': 'no-store' }

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(req)
  if (user instanceof NextResponse) return user
  const { id } = await params
  const file = isFileId(id) ? await getFile(user.id, id) : null
  if (!file) return NextResponse.json({ error: 'File not found' }, { status: 404, headers: NO_STORE })
  return NextResponse.json({ url: await presignGet(file.b2Key, file.filename) }, { headers: NO_STORE })
}
