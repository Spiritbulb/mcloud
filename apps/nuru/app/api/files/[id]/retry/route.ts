// @route-kind: user
// POST /api/files/:id/retry -> { status } | { error }
// Backs "Try again" on a file whose generation failed, or whose `processing` claim went stale (the
// function died). Re-extracts first if no pages were stored.
import { NextResponse, after, type NextRequest } from 'next/server'
import { describeFile } from '@/lib/ai/generate-logic'
import { generateForFile, markFailed } from '@/lib/files/process'
import { claimForRetry, getFile } from '@/lib/files/queries'
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
  if (!describeFile(file, new Date()).canRetry) {
    return NextResponse.json({ error: 'This file cannot be retried' }, { status: 409, headers: NO_STORE })
  }
  if (!(await claimForRetry(user.id, file.id))) {
    return NextResponse.json({ error: 'This file is already being processed' }, { status: 409, headers: NO_STORE })
  }
  // Past the claim nothing may throw: a file left in `processing` could never be retried.
  // generateForFile never throws and re-extracts when no pages are stored.
  try {
    after(() => generateForFile(user.id, file))
    return NextResponse.json({ status: 'processing' }, { headers: NO_STORE })
  } catch (err) {
    console.error('[nuru] retry failed after claim', file.id, err)
    await markFailed(user.id, file.id, 'generation_failed')
    return NextResponse.json({ status: 'failed' }, { headers: NO_STORE })
  }
}
