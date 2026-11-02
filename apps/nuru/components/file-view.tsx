'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import type { StudyOutput } from '@/lib/ai/schema'
import type { FileRow } from '@/lib/files/queries'
import { uploadMayStillBeRunning } from '@/lib/files/upload-logic'
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
const UPLOAD_FAILED = "This upload didn't finish. Please upload the file again."
const STILL_UPLOADING = 'Still uploading…'

async function fetchViewUrl(id: string): Promise<string> {
  const res = await fetch(`/api/files/${id}/url`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`url ${res.status}`)
  return ((await res.json()) as { url: string }).url
}

export function FileView({ initial, initialUrl }: { initial: FileDetail; initialUrl: string | null }) {
  const id = initial.file.id
  const [detail, setDetail] = useState(initial)
  const [url, setUrl] = useState<string | null>(initialUrl)
  const [urlError, setUrlError] = useState<string | null>(null)
  const [uploadFailed, setUploadFailed] = useState(false)
  const [page, setPage] = useState(1)
  const [panel, setPanel] = useState<StudyTab | null>(null)
  const [asking, setAsking] = useState(false)
  const status = detail.file.status

  // The server signs the first URL (valid 3600 s). A fresh one is fetched at most once: after the PDF
  // fails to load, or straight away when the server could not sign one.
  const refetched = useRef(initialUrl === null)
  useEffect(() => {
    if (initialUrl !== null) return
    let off = false
    fetchViewUrl(id).then(
      (u) => { if (!off) setUrl(u) },
      () => { if (!off) setUrlError(OPEN_FAILED) },
    )
    return () => { off = true }
  }, [id, initialUrl])

  const onLoadError = useCallback(() => {
    if (refetched.current) return setUrlError(OPEN_FAILED)
    refetched.current = true
    fetchViewUrl(id).then(setUrl, () => setUrlError(OPEN_FAILED))
  }, [id])

  // While the file is `uploaded` or `processing`, poll its status with a setTimeout chain; a 4xx stops it.
  // An `uploaded` file may still be uploading in another tab: the row exists before the PUT starts.
  // Only once the presigned PUT window has passed does the viewer call /complete itself (the uploader's
  // tab closed mid-upload, say). A 409 (still in progress, or someone else claimed it) or a 5xx means
  // keep polling; only a 422 or 404 means the upload didn't finish.
  const createdAt = detail.file.createdAt
  useEffect(() => {
    if (uploadFailed || (status !== 'uploaded' && status !== 'processing')) return
    let off = false
    let timer: ReturnType<typeof setTimeout> | undefined

    async function tick() {
      if (status === 'uploaded' && !uploadMayStillBeRunning(new Date(createdAt), new Date())) {
        try {
          const res = await fetch(`/api/files/${id}/complete`, { method: 'POST' })
          if (res.status === 422 || res.status === 404) return setUploadFailed(true)
        } catch {}
      }
      if (off) return
      try {
        const res = await fetch(`/api/files/${id}`, { cache: 'no-store' })
        if (off || (res.status >= 400 && res.status < 500)) return
        if (res.ok) setDetail((await res.json()) as FileDetail)
      } catch {}
      if (!off) timer = setTimeout(tick, POLL_MS)
    }

    if (status === 'uploaded') void tick()
    else timer = setTimeout(tick, POLL_MS)
    return () => {
      off = true
      clearTimeout(timer)
    }
  }, [id, status, createdAt, uploadFailed])

  async function retry() {
    const res = await fetch(`/api/files/${id}/retry`, { method: 'POST' })
    if (res.ok) setDetail((d) => ({ ...d, file: { ...d.file, status: 'processing', error: null }, errorMessage: null, canRetry: false }))
  }

  if (uploadFailed) {
    return (
      <section>
        <h1 className="ui-sans mb-4 truncate text-lg font-semibold tracking-tight">{detail.file.filename}</h1>
        <p role="alert" className="ui-sans text-sm text-red-700 dark:text-red-400">{UPLOAD_FAILED}</p>
      </section>
    )
  }

  // Scanned PDFs have no stored text, so there is nothing to ask about.
  const canAsk = detail.file.error !== 'no_text'

  return (
    <section>
      <div className="ui-sans mb-4 flex items-baseline gap-3">
        <h1 className="min-w-0 flex-1 truncate text-lg font-semibold tracking-tight">{detail.file.filename}</h1>
        <span className="text-xs tabular-nums text-[var(--muted)]">Page {page}{detail.file.pages ? ` of ${detail.file.pages}` : ''}</span>
      </div>

      {status === 'uploaded' ? (
        // The object may not exist yet, so the PDF isn't opened until /complete has claimed it.
        <p role="status" className="ui-sans text-sm text-[var(--muted)]">{STILL_UPLOADING}</p>
      ) : urlError ? (
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
        {canAsk && <Fab onClick={() => setAsking(true)} primary>Ask about this page</Fab>}
      </div>

      {asking && canAsk && <AskDialog key={page} fileId={id} page={page} onClose={() => setAsking(false)} />}
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
