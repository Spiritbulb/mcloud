import { notFound, redirect } from 'next/navigation'
import { FileView } from '@/components/file-view'
import { canRetry, errorMessage } from '@/lib/ai/generate-logic'
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
  const { notes, questions } = await getOutputs(user.id, row.id)
  // The storage key stays on the server: only these fields reach the client component.
  const { b2Key: _key, ...file } = row
  void _key
  const failed = row.status === 'failed'
  return (
    <FileView
      initial={{
        file,
        notes,
        questions,
        errorMessage: failed ? errorMessage(row.error) : null,
        canRetry: failed && canRetry(row.error),
      }}
    />
  )
}
