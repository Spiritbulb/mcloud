// Azure OpenAI adapter: one chat-completions call, normalized to ModelTurn for
// the loop. v1 API (VERIFIED): POST {endpoint}/chat/completions, header api-key,
// NO api-version, NO temperature/max_tokens. Passes tools when allowed.
import { SEARCH_NOTES_TOOL } from './prompt'
import type { ModelTurn } from './loop'

export async function callModel(
  messages: Record<string, unknown>[],
  opts: { tools: boolean },
): Promise<ModelTurn> {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT
  const key = process.env.AZURE_OPENAI_API_KEY
  const deployment = process.env.AZURE_OPENAI_CHAT_DEPLOYMENT
  if (!endpoint || !key || !deployment) throw new Error('chat_failed')

  const body: Record<string, unknown> = { model: deployment, messages }
  if (opts.tools) {
    body.tools = [SEARCH_NOTES_TOOL]
    body.tool_choice = 'auto'
  }

  const res = await fetch(`${endpoint.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: { 'api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    console.error('[nuru chat]', res.status, await res.text().catch(() => ''))
    throw new Error('chat_failed')
  }

  const json = (await res.json()) as {
    choices?: {
      message?: {
        content?: string
        tool_calls?: { id: string; function: { name: string; arguments: string } }[]
      }
    }[]
  }
  const msg = json.choices?.[0]?.message
  const rawCalls = msg?.tool_calls ?? []
  const toolCalls = rawCalls
    .filter((c) => c.function?.name === 'search_notes')
    .map((c) => {
      let query = ''
      try {
        query = (JSON.parse(c.function.arguments) as { query?: string }).query ?? ''
      } catch {}
      return { id: c.id, query }
    })
  return {
    text: msg?.content ?? undefined,
    toolCalls: toolCalls.length ? toolCalls : undefined,
  }
}
