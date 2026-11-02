import Link from 'next/link'
import { redirect } from 'next/navigation'
import { UploadButton } from '@/components/upload-button'
import { listFiles } from '@/lib/files/queries'
import { currentUser } from '@/lib/session'

// Dynamic on purpose: reads the session. Only `/` must stay static.
export const dynamic = 'force-dynamic'

const STATUS: Record<string, string> = { uploaded: 'Uploaded', processing: 'Processing', ready: 'Ready', failed: 'Failed' }

function size(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

export default async function FilesPage() {
  const user = await currentUser()
  if (!user) redirect('/auth/sign-in')
  const files = await listFiles(user.id)
  return (
    <section className="ui-sans max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">My files</h1>
      <div className="mt-4">
        {user.canUpload ? (
          <UploadButton />
        ) : (
          <p className="text-sm text-[var(--muted)]">
            Uploads are invite-only for now.{' '}
            <Link href="/waitlist?kind=uploads" className="text-[var(--accent)] underline">Join the waitlist</Link>.
          </p>
        )}
      </div>
      {files.length === 0 ? (
        <p className="mt-8 text-sm text-[var(--muted)]">No files yet.</p>
      ) : (
        <ul className="mt-8 divide-y divide-[var(--line)] border-y border-[var(--line)]">
          {files.map((f) => (
            <li key={f.id} className="flex items-center gap-4 py-3 text-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{f.filename}</p>
                <p className="text-xs text-[var(--muted)]">{size(f.bytes)} · {new Date(f.createdAt).toISOString().slice(0, 10)}</p>
              </div>
              <Link
                href={`/files/${f.id}`}
                className={`rounded-full border px-2.5 py-0.5 text-xs ${f.status === 'failed' ? 'border-red-700 text-red-700 dark:border-red-400 dark:text-red-400' : f.status === 'ready' ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-[var(--line)] text-[var(--muted)]'}`}
              >
                {STATUS[f.status] ?? f.status}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
