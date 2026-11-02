import 'server-only'
import { MODEL, generateStudyOutput } from '@/lib/ai/claude'
import { extractPages } from '@/lib/ai/extract'
import { buildDocumentText, cleanOutputs, hasText, isEmptyOutput, type FileError } from '@/lib/ai/generate-logic'
import { getBytes } from './b2'
import { getPages, saveOutputs, savePages, setStatus, type FileRow } from './queries'

/** Best-effort `failed`; never throws, so callers can use it from a catch. */
export async function markFailed(ownerId: string, fileId: string, error: FileError): Promise<void> {
  try {
    await setStatus(ownerId, fileId, 'failed', { error })
  } catch (err) {
    console.error('[nuru] could not mark file failed', fileId, err)
  }
}

/**
 * Downloads the PDF, extracts its pages and stores them. The caller has already claimed the file
 * (status `processing`).
 * - Download fails: `failed`/`generation_failed` (retryable; retry re-extracts).
 * - The PDF can't be parsed, or parses with no text layer: `failed`/`no_text`.
 * Database errors throw; callers turn them into `generation_failed`.
 */
export async function extractAndStore(ownerId: string, file: FileRow): Promise<'ok' | FileError> {
  let bytes: Uint8Array
  try {
    bytes = await getBytes(file.b2Key)
  } catch (err) {
    console.error('[nuru] download failed', file.id, err)
    await markFailed(ownerId, file.id, 'generation_failed')
    return 'generation_failed'
  }
  let pages: string[]
  try {
    pages = await extractPages(bytes)
  } catch (err) {
    console.error('[nuru] pdf parse failed', file.id, err)
    pages = []
  }
  if (!hasText(pages)) {
    await setStatus(ownerId, file.id, 'failed', { pages: pages.length || undefined, error: 'no_text' })
    return 'no_text'
  }
  await savePages(ownerId, file.id, pages)
  await setStatus(ownerId, file.id, 'processing', { pages: pages.length })
  return 'ok'
}

/**
 * Generates notes and questions from the stored pages, extracting first when none are stored
 * (a retry after a failed download), then marks the file `ready`. The caller has already claimed
 * the file into `processing`. Never throws: any error ends `failed`/`generation_failed`.
 */
export async function generateForFile(ownerId: string, file: FileRow): Promise<void> {
  try {
    let pages = await getPages(ownerId, file.id)
    if (pages.length === 0) {
      if ((await extractAndStore(ownerId, file)) !== 'ok') return
      pages = await getPages(ownerId, file.id)
    }
    const doc = buildDocumentText(pages)
    if (doc === null) {
      await setStatus(ownerId, file.id, 'failed', { error: 'too_long' })
      return
    }
    const out = cleanOutputs(await generateStudyOutput(doc), pages.length)
    if (isEmptyOutput(out)) {
      console.error('[nuru] no cited notes or questions survived cleaning', file.id)
      await markFailed(ownerId, file.id, 'generation_failed')
      return
    }
    await saveOutputs(ownerId, file.id, out, MODEL)
    await setStatus(ownerId, file.id, 'ready', { pages: pages.length })
  } catch (err) {
    console.error('[nuru] generation failed', file.id, err)
    await markFailed(ownerId, file.id, 'generation_failed')
  }
}
