// Pure-JS PDF text extraction, one string per page (no OCR). Ported from mcloud's
// apps/web/app/api/mobile/notes/_ingest/extractPdfText.ts. A PDF with no text layer
// (a scan) yields empty pages; generate-logic's hasText decides what counts as text.
import { extractText, getDocumentProxy } from 'unpdf'

export async function extractPages(bytes: Uint8Array): Promise<string[]> {
  const { text } = await extractText(await getDocumentProxy(bytes), { mergePages: false })
  // Postgres text cannot hold NUL, which some PDFs emit.
  return text.map((p) => p.replaceAll('\0', '').trim())
}
