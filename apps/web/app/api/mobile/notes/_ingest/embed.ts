// Azure OpenAI embeddings (text-embedding-3-large → 3072 dims), v1 API shape.
// Isolated so the embedding provider is swappable. Batches all texts in one call.
// v1 API (VERIFIED): POST {endpoint}/embeddings, body { input, model: deployment },
// header api-key; NO api-version, NO /deployments/ path. AZURE_OPENAI_ENDPOINT ends in /openai/v1.
export async function embed(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT
  const key = process.env.AZURE_OPENAI_API_KEY
  const deployment = process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT
  if (!endpoint || !key || !deployment) throw new Error('embed_failed')

  const url = `${endpoint.replace(/\/$/, '')}/embeddings`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: texts, model: deployment }),
  })

  if (!res.ok) {
    console.error('[nuru embed]', res.status, await res.text().catch(() => ''))
    throw new Error('embed_failed')
  }

  const json = (await res.json()) as { data: { index: number; embedding: number[] }[] }
  return json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding)
}
