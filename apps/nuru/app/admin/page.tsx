import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { currentUser } from '@/lib/session'
import { decideWaitlist } from './actions'

// Dynamic on purpose: reads the session. Only `/` must stay static.
export const dynamic = 'force-dynamic'

type PendingRow = { id: string; email: string; kind: string; institution_name: string | null; note: string | null; created_at: string | Date }
type SourceRow = { name: string; category: string; last_ok_at: string | Date | null; last_error: string | null }

const fmt = (d: string | Date | null) => (d ? new Date(d).toISOString().slice(0, 16).replace('T', ' ') : 'never')
const th = 'py-2 pr-4 text-left font-medium text-[var(--muted)]'
const td = 'py-2 pr-4 align-top'
const btn = 'rounded border border-[var(--line)] px-2.5 py-1 text-sm transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]'

export default async function AdminPage() {
  const user = await currentUser()
  if (!user || user.role !== 'admin') notFound()
  const sql = db()
  const [pending, sources] = (await Promise.all([
    sql`select id, email, kind, institution_name, note, created_at from waitlist where status = 'pending' order by created_at`,
    sql`select name, category, last_ok_at, last_error from sources order by category, name`,
  ])) as [PendingRow[], SourceRow[]]

  return (
    <div className="ui-sans space-y-12">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">Waitlist</h1>
        {pending.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--muted)]">Nobody is waiting for a decision.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--line)]">
                  <th className={th}>Email</th><th className={th}>Kind</th><th className={th}>Institution</th>
                  <th className={th}>Note</th><th className={th}>Date</th><th className={th}><span className="sr-only">Decide</span></th>
                </tr>
              </thead>
              <tbody>
                {pending.map((w) => (
                  <tr key={w.id} className="border-b border-[var(--line)]">
                    <td className={td}>{w.email}</td>
                    <td className={td}>{w.kind}</td>
                    <td className={td}>{w.institution_name ?? ''}</td>
                    <td className={`${td} max-w-xs break-words`}>{w.note ?? ''}</td>
                    <td className={`${td} whitespace-nowrap`}>{fmt(w.created_at).slice(0, 10)}</td>
                    <td className={`${td} whitespace-nowrap`}>
                      <div className="flex gap-2">
                        <form action={decideWaitlist.bind(null, w.id, 'approved')}><button className={btn}>Approve</button></form>
                        <form action={decideWaitlist.bind(null, w.id, 'declined')}><button className={btn}>Decline</button></form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold tracking-tight">Sources</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--line)]">
                <th className={th}>Name</th><th className={th}>Category</th><th className={th}>Last OK</th><th className={th}>Last error</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((s) => (
                <tr key={s.name} className="border-b border-[var(--line)]">
                  <td className={td}>{s.name}</td>
                  <td className={td}>{s.category}</td>
                  <td className={`${td} whitespace-nowrap`}>{fmt(s.last_ok_at)}</td>
                  <td className={`${td} max-w-xs break-words text-[var(--muted)]`}>{s.last_error ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
