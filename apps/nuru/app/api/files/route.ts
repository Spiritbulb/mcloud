// @route-kind: user
// GET /api/files -> { files: FileRow[] } (without b2Key)
import { NextResponse, type NextRequest } from 'next/server'
import { listFiles } from '@/lib/files/queries'
import { requireUser } from '@/lib/session'

export async function GET(req: NextRequest) {
  const user = await requireUser(req)
  if (user instanceof NextResponse) return user
  const files = (await listFiles(user.id)).map((f) => ({ id: f.id, filename: f.filename, bytes: f.bytes, pages: f.pages, status: f.status, error: f.error, createdAt: f.createdAt }))
  return NextResponse.json({ files }, { headers: { 'Cache-Control': 'no-store' } })
}
