// @route-kind: user
// POST /api/files/:id/complete -> { status } | { error }
// Called after the browser PUTs the PDF to B2. Validates the stored object, extracts the pages,
// then generates notes in after(). A missing object inside the upload window is a 409, not a failure.
import { NextResponse, after, type NextRequest } from 'next/server'
import { dbUnavailableOrThrow } from '@/lib/db'
import { deleteObject, headObject, readRange } from '@/lib/files/b2'
import { extractAndStore, generateForFile, markFailed } from '@/lib/files/process'
import { claimForProcessing, deleteUnclaimedUpload, getFile, type FileRow } from '@/lib/files/queries'
import { checkUploadedObject, isFileId, isPdfContentType, uploadMayStillBeRunning } from '@/lib/files/upload-logic'
import { requireUser } from '@/lib/session'

export const maxDuration = 300

const NO_STORE = { 'Cache-Control': 'no-store' }

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(req)
  if (user instanceof NextResponse) return user
  const { id } = await params
  let file: FileRow
  try {
    const found = isFileId(id) ? await getFile(user.id, id) : null
    if (!found) return NextResponse.json({ error: 'File not found' }, { status: 404, headers: NO_STORE })
    file = found
    if (file.status !== 'uploaded') {
      return NextResponse.json({ error: 'This file has already been processed' }, { status: 409, headers: NO_STORE })
    }

    const head = await headObject(file.b2Key)
    // The row exists before the browser's PUT starts, and B2 shows the object only once the PUT ends.
    // Inside the presigned window a missing object may still be on its way: leave it alone.
    if (!head && uploadMayStillBeRunning(new Date(file.createdAt), new Date())) {
      return NextResponse.json({ error: 'Upload still in progress' }, { status: 409, headers: NO_STORE })
    }
    // Read the magic bytes only when the size matches; a short or empty object fails on size anyway.
    const check = checkUploadedObject({
      declared: file.bytes,
      actual: head?.bytes ?? null,
      head: head?.bytes === file.bytes ? await readRange(file.b2Key, 4) : new Uint8Array(),
    })
    const error = !check.ok ? check.error : !isPdfContentType(head?.contentType) ? 'The file is not a PDF' : null
    if (error) {
      // Only a row still `uploaded` is deleted, and its object only then: a request that already
      // claimed the file keeps both.
      if (await deleteUnclaimedUpload(user.id, file.id)) await deleteObject(file.b2Key)
      return NextResponse.json({ error }, { status: 422, headers: NO_STORE })
    }

    // Only one /complete may extract and generate: the losing request sees the claim fail.
    if (!(await claimForProcessing(user.id, file.id, 'uploaded'))) {
      return NextResponse.json({ error: 'This file is already being processed' }, { status: 409, headers: NO_STORE })
    }
  } catch (err) {
    return dbUnavailableOrThrow(err)
  }
  // Past the claim nothing may throw: a file left in `processing` could never be retried.
  try {
    if ((await extractAndStore(user.id, file)) !== 'ok') return NextResponse.json({ status: 'failed' }, { headers: NO_STORE })
    after(() => generateForFile(user.id, file))
    return NextResponse.json({ status: 'processing' }, { headers: NO_STORE })
  } catch (err) {
    console.error('[nuru] complete failed after claim', file.id, err)
    await markFailed(user.id, file.id, 'generation_failed')
    return NextResponse.json({ status: 'failed' }, { headers: NO_STORE })
  }
}
