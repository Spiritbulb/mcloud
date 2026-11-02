import { notFound, redirect } from 'next/navigation'
import { FileView } from '@/components/file-view'
import { describeFile } from '@/lib/ai/generate-logic'
import { presignGet } from '@/lib/files/b2'
import { getFile, getOutputs } from '@/lib/files/queries'
import { isFileId } from '@/lib/files/upload-logic'
import { currentUser } from '@/lib/session'

// Dynamic on purpose: reads the session. Only `/` must stay static.
export const dynamic = 'force-dynamic'

export default async function FilePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser()
  if (!user) redirect('/auth/sign-in')
  const { id } = await params
  const row = isFileId(id) ? await getFile(user.id, id) : null
  if (!row) notFound()
  // Signing here saves the viewer a round trip before the PDF starts loading. Only the signed URL
  // leaves the server; if signing fails the viewer asks /url once.
  const [{ notes, questions }, initialUrl] = await Promise.all([
    getOutputs(user.id, row.id),
    presignGet(row.b2Key, row.filename).catch((err: unknown) => {
      console.error('[nuru] presign failed', row.id, err)
      return null
    }),
  ])
  // The storage key stays on the server: only these fields reach the client component.
  const { b2Key: _key, ...file } = row
  void _key
  // A stale `processing` claim is shown as a retryable failure.
  const { status, error, errorMessage, canRetry } = describeFile(row, new Date())
  return (
    <FileView
      initial={{ file: { ...file, status, error }, notes, questions, errorMessage, canRetry }}
      initialUrl={initialUrl}
    />
  )
}
