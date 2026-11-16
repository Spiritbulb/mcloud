'use client'

// First screen after signing up: name yourself and your organisation (the account that holds your
// sites, billing and team). Laid out like the storefront's /start, which usually comes next, and
// built from the admin kit so it matches the dashboard.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@mcloud/ui/kit/button'
import { Field, TextInput } from '@mcloud/ui/kit/form'
import { ThemedLogo } from '@mcloud/ui/themed-logo'
import { completeOnboarding } from '@/app/(merchant)/org/actions'
import { afterOnboardingPath } from './onboarding-logic'

function slugPreview(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export default function OnboardingClient({ userName, next }: { userName?: string | null; next: string }) {
  const [fullName, setFullName] = useState(userName ?? '')
  const [orgName, setOrgName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, start] = useTransition()
  const router = useRouter()

  const slug = slugPreview(orgName)
  const canSubmit = orgName.trim().length >= 2 && fullName.trim().length >= 2
  const firstName = userName?.split(' ')[0]

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit || isPending) return
    setError(null)
    start(async () => {
      const fd = new FormData()
      fd.append('orgName', orgName)
      fd.append('fullName', fullName)
      try {
        const result = await completeOnboarding(fd)
        if (result?.error) {
          setError(result.error)
          return
        }
        if (result?.success) {
          // Straight to the new org: /org itself is a route handler that redirects, and a
          // client-side push through a handler's redirect does not reliably land.
          router.replace(afterOnboardingPath(result.slug, next))
        }
      } catch (err) {
        if (err instanceof Error && (err as { digest?: string }).digest?.startsWith('NEXT_REDIRECT')) throw err
        setError('Something went wrong. Please try again.')
      }
    })
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
        <ThemedLogo className="mb-10 h-7 w-auto" />

        <h1 className="font-sans text-3xl font-semibold tracking-tight text-foreground">
          {firstName ? `Welcome, ${firstName}.` : 'Welcome.'}
        </h1>
        <p className="mt-2 text-muted-foreground">
          First, name your organisation. It&rsquo;s the account that holds your sites, billing and team, and you can
          add more sites to it later.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-5">
          <Field label="Your name">
            <TextInput
              className="h-11 text-[15px]"
              placeholder="e.g. Wanjiru Kamau"
              autoComplete="name"
              autoFocus={!userName}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </Field>

          <Field
            label="Organisation name"
            hint={slug ? <>Your account address: mcloud.co.ke/org/<span className="font-medium text-foreground">{slug}</span></> : 'Usually your business or organisation name.'}
          >
            <TextInput
              className="h-11 text-[15px]"
              placeholder="e.g. Wanjiru Crafts"
              autoComplete="organization"
              autoFocus={!!userName}
              maxLength={80}
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
            />
          </Field>

          {error && (
            <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <Button type="submit" variant="primary" disabled={!canSubmit || isPending} className="h-11 w-full text-[15px]">
            {isPending && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />}
            {isPending ? 'Creating your organisation…' : 'Continue'}
          </Button>
        </form>
      </main>

      <footer className="pb-8 text-center text-[12px] text-muted-foreground">
        Menengai Cloud &copy; {new Date().getFullYear()}
      </footer>
    </div>
  )
}
