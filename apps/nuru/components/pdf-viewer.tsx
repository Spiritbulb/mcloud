'use client'

// Loaded only with next/dynamic and ssr: false, so the server never evaluates pdf.js.
import 'pdfjs-dist/web/pdf_viewer.css'
import { useEffect, useRef, useState } from 'react'
import type { EventBus, PDFViewer } from 'pdfjs-dist/web/pdf_viewer.mjs'

// pdfjs-dist 5 supports these at runtime but its .d.ts omits them.
type ViewerOptions = ConstructorParameters<typeof PDFViewer>[0] & { abortSignal?: AbortSignal }
type Resettable = { setDocument(doc: null): void }

type Props = {
  url: string
  page: number
  onPageChange(n: number): void
  /** Called when the PDF fails to load, e.g. because the presigned URL expired. */
  onLoadError?(): void
}

type Count = { current: number; total: number }

export default function PdfViewer({ url, page, onPageChange, onLoadError }: Props) {
  const container = useRef<HTMLDivElement>(null)
  const viewerEl = useRef<HTMLDivElement>(null)
  const viewer = useRef<PDFViewer | null>(null)
  const bus = useRef<EventBus | null>(null)
  const callbacks = useRef({ onPageChange, onLoadError })
  const [query, setQuery] = useState('')
  const [count, setCount] = useState<Count | null>(null)
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null)
  const loading = loadedUrl !== url

  useEffect(() => {
    callbacks.current = { onPageChange, onLoadError }
  }, [onPageChange, onLoadError])

  useEffect(() => {
    let cancelled = false
    let destroy: (() => void) | null = null
    let created: PDFViewer | null = null
    // Removes the viewer's ResizeObserver, scroll listener and our event bus listeners.
    const ac = new AbortController()
    const signal = ac.signal
    ;(async () => {
      const pdfjs = await import('pdfjs-dist')
      // pdf_viewer.mjs reads the core library from this global.
      ;(globalThis as { pdfjsLib?: unknown }).pdfjsLib = pdfjs
      const lib = await import('pdfjs-dist/web/pdf_viewer.mjs')
      pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()
      if (cancelled || !container.current || !viewerEl.current) return

      const eventBus = new lib.EventBus()
      const linkService = new lib.PDFLinkService({ eventBus })
      const findController = new lib.PDFFindController({ eventBus, linkService })
      const options: ViewerOptions = {
        container: container.current,
        viewer: viewerEl.current,
        eventBus,
        linkService,
        findController,
        textLayerMode: 1,
        abortSignal: signal,
      }
      const v = new lib.PDFViewer(options)
      created = v
      linkService.setViewer(v)
      eventBus.on('pagesinit', () => { v.currentScaleValue = 'page-width' }, { signal })
      eventBus.on('pagechanging', (e: { pageNumber: number }) => callbacks.current.onPageChange(e.pageNumber), { signal })
      eventBus.on('updatefindmatchescount', (e: { matchesCount: Count }) => setCount(e.matchesCount), { signal })
      eventBus.on('updatefindcontrolstate', (e: { matchesCount: Count }) => setCount(e.matchesCount), { signal })

      const task = pdfjs.getDocument({ url })
      destroy = () => { void task.destroy() }
      const doc = await task.promise
      if (cancelled) return
      v.setDocument(doc)
      linkService.setDocument(doc, null)
      viewer.current = v
      bus.current = eventBus
      setLoadedUrl(url)
    })().catch((err) => {
      if (cancelled) return
      console.error('[nuru] pdf load failed', err)
      callbacks.current.onLoadError?.()
    })
    return () => {
      cancelled = true
      ac.abort()
      ;(created as unknown as Resettable | null)?.setDocument(null)
      destroy?.()
      viewer.current = null
      bus.current = null
    }
  }, [url])

  // Jumps requested from outside (page refs in the notes).
  useEffect(() => {
    const v = viewer.current
    if (v && v.pagesCount > 0 && page >= 1 && page <= v.pagesCount && v.currentPageNumber !== page) v.currentPageNumber = page
  }, [page])

  function find(type: '' | 'again', findPrevious = false) {
    if (!query.trim()) {
      setCount(null)
      return
    }
    bus.current?.dispatch('find', {
      source: null,
      type,
      query,
      caseSensitive: false,
      entireWord: false,
      highlightAll: true,
      findPrevious,
      matchDiacritics: false,
    })
  }

  return (
    <div className="ui-sans">
      <form
        role="search"
        className="mb-3 flex items-center gap-2"
        onSubmit={(e) => { e.preventDefault(); find('') }}
      >
        <label htmlFor="pdf-find" className="sr-only">Search this file</label>
        <input
          id="pdf-find"
          type="search"
          value={query}
          placeholder="Search this file"
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && count && count.total > 0) {
              e.preventDefault()
              find('again', e.shiftKey)
            }
          }}
          onInput={() => setCount(null)}
          className="min-w-0 flex-1 rounded border border-[var(--line)] bg-transparent px-3 py-1.5 text-sm focus:border-[var(--accent)] focus:outline-none"
        />
        <span aria-live="polite" className="w-16 text-right text-xs tabular-nums text-[var(--muted)]">
          {count ? (count.total ? `${count.current} of ${count.total}` : 'No matches') : ''}
        </span>
        <button
          type="button"
          aria-label="Previous match"
          disabled={!count?.total}
          onClick={() => find('again', true)}
          className="rounded border border-[var(--line)] px-2 py-1 text-sm disabled:opacity-40"
        >
          ↑
        </button>
        <button
          type="button"
          aria-label="Next match"
          disabled={!count?.total}
          onClick={() => find('again')}
          className="rounded border border-[var(--line)] px-2 py-1 text-sm disabled:opacity-40"
        >
          ↓
        </button>
      </form>
      <div className="relative h-[calc(100vh-15rem)] min-h-[24rem] overflow-hidden rounded border border-[var(--line)] bg-[color-mix(in_srgb,var(--line)_45%,var(--paper))]">
        {/* PDFViewer requires an absolutely positioned scroll container. */}
        <div ref={container} className="absolute inset-0 overflow-auto">
          <div ref={viewerEl} className="pdfViewer" />
        </div>
        {loading && (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-[var(--muted)]">Opening the PDF…</p>
        )}
      </div>
    </div>
  )
}
