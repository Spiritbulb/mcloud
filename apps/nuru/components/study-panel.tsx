'use client'

import { useState } from 'react'
import type { StudyOutput } from '@/lib/ai/schema'

export type StudyTab = 'notes' | 'questions'

type Props = {
  tab: StudyTab
  onTab(t: StudyTab): void
  status: 'uploaded' | 'processing' | 'ready' | 'failed'
  notes: StudyOutput['notes'] | null
  questions: StudyOutput['questions'] | null
  errorMessage: string | null
  canRetry: boolean
  onRetry(): Promise<void>
  onJump(n: number): void
  onClose(): void
}

function PageRefs({ pages, onJump }: { pages: number[]; onJump(n: number): void }) {
  return (
    <span className="ui-sans ml-1 inline-flex flex-wrap gap-1 align-baseline">
      {pages.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onJump(p)}
          aria-label={`Go to page ${p}`}
          className="rounded-sm px-1 text-xs tabular-nums text-[var(--accent)] underline decoration-dotted underline-offset-2 hover:bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]"
        >
          p. {p}
        </button>
      ))}
    </span>
  )
}

function Question({ q, onJump }: { q: StudyOutput['questions'][number]; onJump(n: number): void }) {
  const [open, setOpen] = useState(false)
  return (
    <li className="py-4">
      <p>{q.question}</p>
      {open ? (
        <p className="mt-2 border-l-2 border-[var(--accent)] pl-3 text-[var(--ink)]">
          {q.answer}
          <PageRefs pages={q.pages} onJump={onJump} />
        </p>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className="ui-sans mt-2 text-sm text-[var(--accent)] underline underline-offset-2">
          Show answer
        </button>
      )}
    </li>
  )
}

export function StudyPanel(props: Props) {
  const { tab, onTab, status, notes, questions, errorMessage, canRetry, onRetry, onJump, onClose } = props
  const [retrying, setRetrying] = useState(false)
  const working = status === 'uploaded' || status === 'processing'

  let body: React.ReactNode
  if (working) {
    body = <p className="ui-sans text-sm text-[var(--muted)]">Nuru is reading your file…</p>
  } else if (status === 'failed') {
    body = (
      <div className="ui-sans text-sm">
        <p role="alert">{errorMessage}</p>
        {canRetry && (
          <button
            type="button"
            disabled={retrying}
            onClick={async () => { setRetrying(true); try { await onRetry() } finally { setRetrying(false) } }}
            className="mt-3 rounded bg-[var(--accent)] px-3 py-1.5 font-medium text-[var(--paper)] disabled:opacity-60"
          >
            {retrying ? 'Trying again…' : 'Try again'}
          </button>
        )}
      </div>
    )
  } else if (tab === 'notes') {
    body = !notes?.length ? (
      <p className="ui-sans text-sm text-[var(--muted)]">No notes for this file.</p>
    ) : (
      <div className="space-y-6">
        {notes.map((n, i) => (
          <section key={i}>
            <h3 className="ui-sans text-sm font-semibold">{n.heading}</h3>
            <ul className="mt-2 list-disc space-y-2 pl-5">
              {n.points.map((pt, j) => (
                <li key={j}>{pt.text}<PageRefs pages={pt.pages} onJump={onJump} /></li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    )
  } else {
    body = !questions?.length ? (
      <p className="ui-sans text-sm text-[var(--muted)]">No questions for this file.</p>
    ) : (
      <ol className="divide-y divide-[var(--line)]">
        {questions.map((q, i) => <Question key={i} q={q} onJump={onJump} />)}
      </ol>
    )
  }

  return (
    <aside
      aria-label="Study notes"
      className="fixed inset-x-0 bottom-10 z-30 flex max-h-[70vh] flex-col border-t border-[var(--line)] bg-[var(--paper)] shadow-[0_-8px_24px_-12px_rgb(0_0_0/0.18)] sm:inset-x-auto sm:right-0 sm:top-0 sm:max-h-none sm:w-[26rem] sm:border-l sm:border-t-0 sm:shadow-[-8px_0_24px_-12px_rgb(0_0_0/0.18)]"
    >
      <div className="ui-sans flex items-center gap-1 border-b border-[var(--line)] px-4 py-2">
        <div role="tablist" className="flex gap-1">
          {(['notes', 'questions'] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => onTab(t)}
              className={`rounded px-3 py-1 text-sm ${tab === t ? 'bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] font-medium text-[var(--accent)]' : 'text-[var(--muted)] hover:text-[var(--ink)]'}`}
            >
              {t === 'notes' ? 'Notes' : 'Questions'}
            </button>
          ))}
        </div>
        <button type="button" onClick={onClose} aria-label="Close notes" className="ml-auto rounded px-2 py-1 text-lg leading-none text-[var(--muted)] hover:text-[var(--ink)]">
          ×
        </button>
      </div>
      <div className="overflow-y-auto px-5 py-4 text-[0.95rem]">{body}</div>
    </aside>
  )
}
