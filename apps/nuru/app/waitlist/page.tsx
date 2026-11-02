import { WaitlistForm } from '@/components/waitlist-form'
import { currentUser } from '@/lib/session'

// Dynamic on purpose: reads the session and searchParams. Only `/` must stay static.
export default async function WaitlistPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { kind: raw } = await searchParams
  const kind = raw === 'institution' ? 'institution' : 'uploads'
  const user = await currentUser()
  return (
    <section className="max-w-md">
      <h1 className="text-2xl font-semibold tracking-tight">
        {kind === 'institution' ? 'Add your institution to Nuru' : 'Join the uploads waitlist'}
      </h1>
      <p className="ui-sans mt-1 text-sm text-[var(--muted)]">
        {kind === 'institution'
          ? 'Tell us which institution should be in the feed. We will email you when it is added.'
          : 'Uploading files is limited for now. Leave your email and we will let you know when you can upload.'}
      </p>
      <WaitlistForm kind={kind} signedInEmail={user?.email ?? null} />
    </section>
  )
}
