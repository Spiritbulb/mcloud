// @route-kind: user
// GET /api/files/:id -> { file, notes, questions, errorMessage, canRetry } | { error }
// Polled by the viewer while a file is processing. Never returns the storage key.
import { NextResponse, type NextRequest } from 'next/server'
import { describeFile } from '@/lib/ai/generate-logic'
import { dbUnavailableOrThrow } from '@/lib/db'
import { getFile, getOutputs } from '@/lib/files/queries'
import { isFileId } from '@/lib/files/upload-logic'
import { requireUser } from '@/lib/session'

const NO_STORE = { 'Cache-Control': 'no-store' }

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(req)
  if (user instanceof NextResponse) return user
  const { id } = await params
  try {
    return await detail(user.id, id)
  } catch (err) {
    return dbUnavailableOrThrow(err)
  }
}

async function detail(ownerId: string, id: string): Promise<NextResponse> {
  const row = isFileId(id) ? await getFile(ownerId, id) : null
  if (!row) return NextResponse.json({ error: 'File not found' }, { status: 404, headers: NO_STORE })
  const { b2Key: _key, ...file } = row
  void _key
  const { notes, questions } = await getOutputs(ownerId, row.id)
  // A stale `processing` claim is reported as a retryable failure.
  const { status, error, errorMessage, canRetry } = describeFile(row, new Date())
  return NextResponse.json(
    { file: { ...file, status, error }, notes, questions, errorMessage, canRetry },
    { headers: NO_STORE },
  )
}
