// Azure AI Vision — Image Analysis 4.0 "read" (OCR). Isolated so the OCR vendor
// can be swapped in one file. Returns plain text; throws 'extraction_failed'.
const API_VERSION = '2024-02-01'

export async function extractText(
  bytes: ArrayBuffer,
  _contentType: string,
): Promise<string> {
  const endpoint = process.env.AZURE_VISION_ENDPOINT
  const key = process.env.AZURE_VISION_API_KEY
  if (!endpoint || !key) throw new Error('extraction_failed')

  const url =
    `${endpoint.replace(/\/$/, '')}/computervision/imageanalysis:analyze` +
    `?api-version=${API_VERSION}&features=read`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': key,
      'Content-Type': 'application/octet-stream',
    },
    body: bytes,
  })

  if (!res.ok) {
    console.error('[nuru extract]', res.status, await res.text().catch(() => ''))
    throw new Error('extraction_failed')
  }

  const json = (await res.json()) as {
    readResult?: { blocks?: { lines?: { text: string }[] }[] }
  }
  const lines =
    json.readResult?.blocks?.flatMap((b) => b.lines?.map((l) => l.text) ?? []) ?? []
  return lines.join('\n').trim()
}
