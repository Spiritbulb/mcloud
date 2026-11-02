// @route-kind: user
// GET /api/files/:id -> { file, notes, questions, errorMessage, canRetry } | { error }
// Polled by the viewer while a file is processing. Never returns the storage key.
import { NextResponse, type NextRequest } from 'next/server'
import { canRetry, errorMessage } from '@/lib/ai/generate-logic'
import { getFile, getOutputs } from '@/lib/files/queries'
import { isFileId } from '@/lib/files/upload-logic'
import { requireUser } from '@/lib/session'

const NO_STORE = { 'Cache-Control': 'no-store' }

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(req)
  if (user instanceof NextResponse) return user
  const { id } = await params
  const row = isFileId(id) ? await getFile(user.id, id) : null
  if (!row) return NextResponse.json({ error: 'File not found' }, { status: 404, headers: NO_STORE })
  const { b2Key: _key, ...file } = row
  void _key
  const { notes, questions } = await getOutputs(user.id, row.id)
  const failed = row.status === 'failed'
  return NextResponse.json(
    {
      file,
      notes,
      questions,
      errorMessage: failed ? errorMessage(row.error) : null,
      canRetry: failed && canRetry(row.error),
    },
    { headers: NO_STORE },
  )
}
