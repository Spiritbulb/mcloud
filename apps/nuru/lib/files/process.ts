import 'server-only'
import { MODEL, generateStudyOutput } from '@/lib/ai/claude'
import { extractPages } from '@/lib/ai/extract'
import { buildDocumentText, cleanOutputs, hasText, type FileError } from '@/lib/ai/generate-logic'
import { getBytes } from './b2'
import { getPages, saveOutputs, savePages, setStatus, type FileRow } from './queries'

/**
 * Downloads the PDF, extracts its pages and stores them. The caller has already claimed the file
 * (status `processing`). A PDF that cannot be read, or has no text layer, ends `failed`/`no_text`.
 */
export async function extractAndStore(ownerId: string, file: FileRow): Promise<'ok' | FileError> {
  let pages: string[]
  try {
    pages = await extractPages(await getBytes(file.b2Key))
  } catch (err) {
    console.error('[nuru] extract failed', file.id, err)
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
 * Generates notes and questions from the stored pages, then marks the file `ready`. Runs in
 * `after()`; the route has already claimed the file into `processing`. Never throws.
 */
export async function generateForFile(ownerId: string, fileId: string): Promise<void> {
  try {
    const pages = await getPages(ownerId, fileId)
    if (pages.length === 0) {
      await setStatus(ownerId, fileId, 'failed', { error: 'no_text' })
      return
    }
    const doc = buildDocumentText(pages)
    if (doc === null) {
      await setStatus(ownerId, fileId, 'failed', { error: 'too_long' })
      return
    }
    const out = cleanOutputs(await generateStudyOutput(doc), pages.length)
    await saveOutputs(ownerId, fileId, out, MODEL)
    await setStatus(ownerId, fileId, 'ready', { pages: pages.length })
  } catch (err) {
    console.error('[nuru] generation failed', fileId, err)
    try {
      await setStatus(ownerId, fileId, 'failed', { error: 'generation_failed' })
    } catch (e) {
      console.error('[nuru] could not mark file failed', fileId, e)
    }
  }
}
