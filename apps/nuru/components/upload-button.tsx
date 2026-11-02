'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { isPdfFile } from '@/lib/files/upload-logic'

const MAX_BYTES = 25 * 1024 * 1024

async function errorOf(res: Response, fallback: string): Promise<string> {
  try {
    const d = await res.json()
    if (typeof d?.error === 'string') return d.error
  } catch {}
  return fallback
}

export function UploadButton() {
  const router = useRouter()
  const input = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<'idle' | 'uploading' | 'processing'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function onFile(file: File) {
    setError(null)
    // Some browsers report no type for a PDF; the server still checks the bytes. Always sent as application/pdf.
    if (!isPdfFile(file)) return setError('Choose a PDF file.')
    if (file.size < 1) return setError('That file is empty.')
    if (file.size > MAX_BYTES) return setError('Files can be at most 25 MB.')
    try {
      setStep('uploading')
      const urlRes = await fetch('/api/files/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, mime: 'application/pdf', bytes: file.size }),
      })
      if (!urlRes.ok) throw new Error(await errorOf(urlRes, 'Could not start the upload.'))
      const { id, uploadUrl } = (await urlRes.json()) as { id: string; uploadUrl: string }
      const put = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'application/pdf' }, body: file })
      if (!put.ok) throw new Error('The upload failed. Please try again.')
      setStep('processing')
      const done = await fetch(`/api/files/${id}/complete`, { method: 'POST' })
      if (!done.ok) throw new Error(await errorOf(done, 'Could not process the file.'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setStep('idle')
      if (input.current) input.current.value = ''
      router.refresh()
    }
  }

  const busy = step !== 'idle'
  return (
    <div className="ui-sans">
      <input
        ref={input}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        id="nuru-upload"
        disabled={busy}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void onFile(f) }}
      />
      <label
        htmlFor="nuru-upload"
        className={`inline-block cursor-pointer rounded bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--paper)] focus-within:outline-2 ${busy ? 'opacity-60' : ''}`}
      >
        {step === 'uploading' ? 'Uploading…' : step === 'processing' ? 'Reading the PDF…' : 'Upload a PDF'}
      </label>
      <p className="mt-1 text-xs text-[var(--muted)]">PDF only, up to 25 MB.</p>
      {error && <p role="alert" className="mt-2 text-sm text-red-700 dark:text-red-400">{error}</p>}
    </div>
  )
}
