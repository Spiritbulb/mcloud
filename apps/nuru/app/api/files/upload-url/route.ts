// @route-kind: user
// POST /api/files/upload-url  { filename, mime, bytes } -> { id, uploadUrl }
import { NextResponse, type NextRequest } from 'next/server'
import { presignPut } from '@/lib/files/b2'
import { createFile } from '@/lib/files/queries'
import { objectKey, validateUploadRequest } from '@/lib/files/upload-logic'
import { requireUser } from '@/lib/session'

const NO_STORE = { 'Cache-Control': 'no-store' }

export async function POST(req: NextRequest) {
  const user = await requireUser(req)
  if (user instanceof NextResponse) return user
  if (!user.canUpload) {
    return NextResponse.json({ error: 'Uploads are invite-only for now.' }, { status: 403, headers: NO_STORE })
  }
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400, headers: NO_STORE })
  }
  const parsed = validateUploadRequest(body)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400, headers: NO_STORE })
  const { filename, bytes } = parsed.value
  const id = crypto.randomUUID()
  const b2Key = objectKey(user.id, id, filename)
  const uploadUrl = await presignPut(b2Key, bytes)
  await createFile(user.id, { id, b2Key, filename, bytes })
  return NextResponse.json({ id, uploadUrl }, { headers: NO_STORE })
}
