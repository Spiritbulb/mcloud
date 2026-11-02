'use client'

import { useEffect, useRef, useState } from 'react'

type Props = { fileId: string; page: number; onClose(): void }

/** One question about one page, and one answer. Asking again replaces the answer; there is no thread. */
export function AskDialog({ fileId, page, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const d = dialog.current
    if (d && !d.open) d.showModal()
    return () => d?.close()
  }, [])

  async function ask() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/files/${fileId}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page, question }),
      })
      const data = (await res.json().catch(() => ({}))) as { answer?: string; error?: string }
      if (!res.ok || !data.answer) throw new Error(data.error ?? "Nuru couldn't answer that right now.")
      setAnswer(data.answer)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nuru couldn't answer that right now.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      aria-labelledby="ask-title"
      className="ui-sans m-auto w-[min(32rem,calc(100vw-2rem))] rounded-lg border border-[var(--line)] bg-[var(--paper)] p-0 text-[var(--ink)] backdrop:bg-black/30"
    >
      <form
        className="p-5"
        onSubmit={(e) => { e.preventDefault(); if (!busy && question.trim()) void ask() }}
      >
        <div className="flex items-baseline justify-between">
          <h2 id="ask-title" className="text-base font-semibold">Ask about page {page}</h2>
          <button type="button" onClick={() => dialog.current?.close()} aria-label="Close" className="text-lg leading-none text-[var(--muted)] hover:text-[var(--ink)]">×</button>
        </div>
        <p className="mt-1 text-xs text-[var(--muted)]">Nuru answers from this page only.</p>
        <label htmlFor="ask-question" className="sr-only">Your question</label>
        <textarea
          id="ask-question"
          value={question}
          maxLength={500}
          rows={3}
          autoFocus
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              e.currentTarget.form?.requestSubmit()
            }
          }}
          placeholder="What does this page say about…"
          className="mt-3 w-full resize-none rounded border border-[var(--line)] bg-transparent px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none"
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs tabular-nums text-[var(--muted)]">{question.length}/500</span>
          <button
            type="submit"
            disabled={busy || !question.trim()}
            className="rounded bg-[var(--accent)] px-4 py-1.5 text-sm font-medium text-[var(--paper)] disabled:opacity-50"
          >
            {busy ? 'Reading the page…' : answer ? 'Ask again' : 'Ask'}
          </button>
        </div>
        {error && <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-400">{error}</p>}
        {answer && (
          <div aria-live="polite" className="mt-4 border-t border-[var(--line)] pt-4">
            <p className="whitespace-pre-line font-serif text-[0.95rem] leading-relaxed">{answer}</p>
          </div>
        )}
      </form>
    </dialog>
  )
}
