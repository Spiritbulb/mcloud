import Link from 'next/link'
import type { NuruUser } from '@/lib/session'

const link = 'text-[var(--muted)] hover:text-[var(--ink)] transition-colors'

export function SiteHeader({ user }: { user: NuruUser | null }) {
  return (
    <header className="ui-sans border-b border-[var(--line)]">
      <nav className="mx-auto flex max-w-3xl items-center gap-5 px-4 py-3 text-sm">
        <Link href="/" className="mr-auto text-lg font-semibold tracking-tight text-[var(--accent)]">
          Nuru
        </Link>
        <Link href="/feed" className={link}>Feed</Link>
        {user && <Link href="/files" className={link}>My files</Link>}
        {user?.role === 'admin' && <Link href="/admin" className={link}>Admin</Link>}
        {/* Plain anchors: these are redirecting route handlers, so nothing should prefetch them. */}
        {user ? (
          <a href="/auth/sign-out" className={link}>Sign out</a>
        ) : (
          <a href="/auth/sign-in" className={link}>Sign in</a>
        )}
      </nav>
    </header>
  )
}
