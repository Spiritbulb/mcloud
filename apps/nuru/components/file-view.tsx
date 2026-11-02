'use client'

import { useCallback, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import type { StudyOutput } from '@/lib/ai/schema'
import type { FileRow } from '@/lib/files/queries'
import { AskDialog } from './ask-dialog'
import { StudyPanel, type StudyTab } from './study-panel'

// pdf.js touches browser globals at import time: keep it out of the server build.
const PdfViewer = dynamic(() => import('./pdf-viewer'), {
  ssr: false,
  loading: () => <p className="ui-sans text-sm text-[var(--muted)]">Opening the PDF…</p>,
})

export type FileDetail = {
  file: Omit<FileRow, 'b2Key'>
  notes: StudyOutput['notes'] | null
  questions: StudyOutput['questions'] | null
  errorMessage: string | null
  canRetry: boolean
}

const POLL_MS = 4000
const OPEN_FAILED = "Couldn't open this PDF. Reload the page to try again."

async function fetchViewUrl(id: string): Promise<string> {
  const res = await fetch(`/api/files/${id}/url`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`url ${res.status}`)
  return ((await res.json()) as { url: string }).url
}

export function FileView({ initial }: { initial: FileDetail }) {
  const id = initial.file.id
  const [detail, setDetail] = useState(initial)
  const [url, setUrl] = useState<string | null>(null)
  const [urlError, setUrlError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [panel, setPanel] = useState<StudyTab | null>(null)
  const [asking, setAsking] = useState(false)
  const status = detail.file.status

  // The presigned URL lives 300 s. Fetched on mount; if the PDF then fails to load, fetched once more.
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let off = false
    fetchViewUrl(id).then(
      (u) => { if (!off) setUrl(u) },
      () => { if (!off) setUrlError(OPEN_FAILED) },
    )
    return () => { off = true }
  }, [id, attempt])

  const onLoadError = useCallback(() => {
    if (attempt > 0) return setUrlError(OPEN_FAILED)
    setAttempt(1)
  }, [attempt])

  useEffect(() => {
    if (status !== 'uploaded' && status !== 'processing') return
    const t = setInterval(async () => {
      try {
        const res = await fetch(`/api/files/${id}`, { cache: 'no-store' })
        if (res.ok) setDetail((await res.json()) as FileDetail)
      } catch {}
    }, POLL_MS)
    return () => clearInterval(t)
  }, [id, status])

  async function retry() {
    const res = await fetch(`/api/files/${id}/retry`, { method: 'POST' })
    if (res.ok) setDetail((d) => ({ ...d, file: { ...d.file, status: 'processing', error: null }, errorMessage: null, canRetry: false }))
  }

  return (
    <section>
      <div className="ui-sans mb-4 flex items-baseline gap-3">
        <h1 className="min-w-0 flex-1 truncate text-lg font-semibold tracking-tight">{detail.file.filename}</h1>
        <span className="text-xs tabular-nums text-[var(--muted)]">Page {page}{detail.file.pages ? ` of ${detail.file.pages}` : ''}</span>
      </div>

      {urlError ? (
        <p role="alert" className="ui-sans text-sm text-red-700 dark:text-red-400">{urlError}</p>
      ) : url ? (
        <PdfViewer url={url} page={page} onPageChange={setPage} onLoadError={onLoadError} />
      ) : (
        <p className="ui-sans text-sm text-[var(--muted)]">Opening the PDF…</p>
      )}

      {panel && (
        <StudyPanel
          tab={panel}
          onTab={setPanel}
          status={status}
          notes={detail.notes}
          questions={detail.questions}
          errorMessage={detail.errorMessage}
          canRetry={detail.canRetry}
          onRetry={retry}
          onJump={setPage}
          onClose={() => setPanel(null)}
        />
      )}

      {/* Sits above the fixed AI disclaimer bar, never over it. */}
      <div
        className={`ui-sans fixed bottom-14 right-4 z-30 flex flex-col items-end gap-2 sm:flex-row ${panel ? 'max-sm:hidden sm:right-[27rem]' : ''}`}
      >
        <Fab onClick={() => setPanel('notes')} active={panel === 'notes'}>Make notes</Fab>
        <Fab onClick={() => setPanel('questions')} active={panel === 'questions'}>Questions</Fab>
        <Fab onClick={() => setAsking(true)} primary>Ask about this page</Fab>
      </div>

      {asking && <AskDialog key={page} fileId={id} page={page} onClose={() => setAsking(false)} />}
    </section>
  )
}

function Fab({ children, onClick, primary, active }: { children: React.ReactNode; onClick(): void; primary?: boolean; active?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-4 py-2 text-sm shadow-[0_4px_14px_-6px_rgb(0_0_0/0.3)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
        primary
          ? 'border-[var(--accent)] bg-[var(--accent)] font-medium text-[var(--paper)]'
          : active
            ? 'border-[var(--accent)] bg-[var(--paper)] text-[var(--accent)]'
            : 'border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-[var(--accent)]'
      }`}
    >
      {children}
    </button>
  )
}
