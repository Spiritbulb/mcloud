// Pure-JS PDF text extraction (no OCR, no vendor cost). Used for text-based PDFs;
// a PDF with no text layer (scanned/photo) returns '' so the route can tell the
// user to upload it as a photo instead. unpdf wraps pdf.js and runs in a Node
// serverless function with no native binary.
import { extractText, getDocumentProxy } from 'unpdf'

export async function extractPdfText(bytes: ArrayBuffer): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(bytes))
  const { text } = await extractText(pdf, { mergePages: true })
  return text.trim()
}
