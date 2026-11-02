// @route-kind: user
// POST /api/files/:id/retry -> { status } | { error }
// Backs "Try again" on a file whose generation failed. Pages are already stored.
import { NextResponse, after, type NextRequest } from 'next/server'
import { canRetry } from '@/lib/ai/generate-logic'
import { generateForFile } from '@/lib/files/process'
import { claimForProcessing, getFile } from '@/lib/files/queries'
import { isFileId } from '@/lib/files/upload-logic'
import { requireUser } from '@/lib/session'

export const maxDuration = 300

const NO_STORE = { 'Cache-Control': 'no-store' }

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(req)
  if (user instanceof NextResponse) return user
  const { id } = await params
  const file = isFileId(id) ? await getFile(user.id, id) : null
  if (!file) return NextResponse.json({ error: 'File not found' }, { status: 404, headers: NO_STORE })
  if (file.status !== 'failed' || !canRetry(file.error)) {
    return NextResponse.json({ error: 'This file cannot be retried' }, { status: 409, headers: NO_STORE })
  }
  if (!(await claimForProcessing(user.id, file.id, 'failed'))) {
    return NextResponse.json({ error: 'This file is already being processed' }, { status: 409, headers: NO_STORE })
  }
  after(() => generateForFile(user.id, file.id))
  return NextResponse.json({ status: 'processing' }, { headers: NO_STORE })
}
