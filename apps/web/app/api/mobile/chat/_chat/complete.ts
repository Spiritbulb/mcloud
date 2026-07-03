// GPT-5 via Azure OpenAI v1 API. Isolated so the chat model is swappable in one file.
// v1 API (VERIFIED): POST {endpoint}/chat/completions, body { model: deployment, messages },
// header api-key; NO api-version. Do NOT send temperature/max_tokens — the gpt-5 deployment
// only accepts default temperature; defaults produce good answers.
// The prompt constrains the model to answer from the provided note chunks.
export async function chatComplete(
  question: string,
  chunks: { content: string }[],
): Promise<string> {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT
  const key = process.env.AZURE_OPENAI_API_KEY
  const deployment = process.env.AZURE_OPENAI_CHAT_DEPLOYMENT
  if (!endpoint || !key || !deployment) throw new Error('chat_failed')

  const context = chunks.map((c, i) => `[${i + 1}] ${c.content}`).join('\n\n')
  const system =
    'You are Nuru, a study assistant. Answer the student\'s question using ONLY the ' +
    'note excerpts provided below. If the notes do not contain the answer, say so plainly ' +
    'and do not invent facts. Be concise and clear.\n\nNOTES:\n' +
    (context || '(no relevant notes found)')

  const url = `${endpoint.replace(/\/$/, '')}/chat/completions`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: deployment,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: question },
      ],
    }),
  })

  if (!res.ok) {
    console.error('[nuru chat]', res.status, await res.text().catch(() => ''))
    throw new Error('chat_failed')
  }

  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[]
  }
  const answer = json.choices?.[0]?.message?.content?.trim()
  if (!answer) throw new Error('chat_failed')
  return answer
}
