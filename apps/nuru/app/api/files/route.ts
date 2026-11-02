// @route-kind: user
// GET /api/files -> { files: FileRow[] } (without b2Key)
import { NextResponse, type NextRequest } from 'next/server'
import { dbUnavailableOrThrow } from '@/lib/db'
import { listFiles } from '@/lib/files/queries'
import { requireUser } from '@/lib/session'

export async function GET(req: NextRequest) {
  const user = await requireUser(req)
  if (user instanceof NextResponse) return user
  let rows
  try {
    rows = await listFiles(user.id)
  } catch (err) {
    return dbUnavailableOrThrow(err)
  }
  const files = rows.map((f) => ({ id: f.id, filename: f.filename, bytes: f.bytes, pages: f.pages, status: f.status, error: f.error, createdAt: f.createdAt }))
  return NextResponse.json({ files }, { headers: { 'Cache-Control': 'no-store' } })
}
