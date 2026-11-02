export const MAX_BYTES = 25 * 1024 * 1024

type Validated = { ok: true; value: { filename: string; bytes: number } } | { ok: false; error: string }

export function validateUploadRequest(body: unknown): Validated {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Invalid request body' }
  const { filename, mime, bytes } = body as Record<string, unknown>
  if (typeof filename !== 'string' || !filename.trim()) return { ok: false, error: 'A file name is required' }
  if (mime !== 'application/pdf') return { ok: false, error: 'Only PDF files can be uploaded' }
  if (typeof bytes !== 'number' || !Number.isInteger(bytes) || bytes < 1) return { ok: false, error: 'The file is empty' }
  if (bytes > MAX_BYTES) return { ok: false, error: 'Files can be at most 25 MB' }
  return { ok: true, value: { filename: filename.trim(), bytes } }
}

/**
 * Last path segment, anything outside [A-Za-z0-9._-] becomes '-', runs collapsed, stem capped at
 * 120 characters. Always ends in `.pdf`: any other extension is replaced.
 */
export function safeFilename(name: string): string {
  const base = (name.split(/[\\/]/).pop() ?? '').trim().replace(/^\.+/, '')
  const dot = base.lastIndexOf('.')
  const stem = (dot > 0 ? base.slice(0, dot) : base)
    .replace(/[^A-Za-z0-9._-]/g, '-')
    .replace(/-{2,}/g, '-')
    .slice(0, 120)
  return `${stem && stem !== '-' ? stem : 'document'}.pdf`
}

export function objectKey(ownerId: string, fileId: string, filename: string): string {
  return `files/${ownerId}/${fileId}/${safeFilename(filename)}`
}

/** Browser-side check: a PDF by type, or by `.pdf` name when the browser reports no type. */
export function isPdfFile(file: { type: string; name: string }): boolean {
  return file.type === 'application/pdf' || (file.type === '' && /\.pdf$/i.test(file.name))
}

const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d] // %PDF-

export function checkUploadedObject(o: { declared: number; actual: number | null; head: Uint8Array }): { ok: true } | { ok: false; error: string } {
  if (o.actual === null) return { ok: false, error: 'The upload did not arrive' }
  if (o.actual !== o.declared) return { ok: false, error: 'The uploaded size did not match' }
  if (o.actual > MAX_BYTES) return { ok: false, error: 'Files can be at most 25 MB' }
  if (!PDF_MAGIC.every((b, i) => o.head[i] === b)) return { ok: false, error: 'The file is not a PDF' }
  return { ok: true }
}

/** The object's stored Content-Type must be application/pdf (parameters ignored). */
export function isPdfContentType(contentType: string | undefined): boolean {
  return contentType?.split(';')[0].trim().toLowerCase() === 'application/pdf'
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** File ids are uuids; anything else is a 404 before it reaches a uuid column. */
export function isFileId(id: string): boolean {
  return UUID_RE.test(id)
}
