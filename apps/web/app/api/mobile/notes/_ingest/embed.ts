// Azure OpenAI embeddings (text-embedding-3-large → 3072 dims). Isolated so the
// embedding provider is swappable. Batches all texts in one request.
// NOTE: AZURE_OPENAI_ENDPOINT must be the resource form
// https://<resource>.openai.azure.com (NOT the Foundry project URL).
export async function embed(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT
  const key = process.env.AZURE_OPENAI_API_KEY
  const deployment = process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION
  if (!endpoint || !key || !deployment || !apiVersion) throw new Error('embed_failed')

  const url =
    `${endpoint.replace(/\/$/, '')}/openai/deployments/${deployment}/embeddings` +
    `?api-version=${apiVersion}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: texts }),
  })

  if (!res.ok) {
    console.error('[nuru embed]', res.status, await res.text().catch(() => ''))
    throw new Error('embed_failed')
  }

  const json = (await res.json()) as { data: { index: number; embedding: number[] }[] }
  return json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding)
}
