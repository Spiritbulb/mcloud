// Azure OpenAI (GPT-5) adapter. Translates the loop's neutral history into the
// OpenAI wire shape, runs one non-streaming call for the tool phase, and a
// streaming call for the final answer. v1 API: POST {endpoint}/chat/completions,
// header api-key, body {model, messages}, no api-version/temperature/max_tokens.
import { SEARCH_NOTES_TOOL } from './prompt'
import type { ModelTurn } from './loop'

export const AZURE_LABEL = 'GPT-5'

type Msg = Record<string, unknown>
type Usage = { inputTokens: number; outputTokens: number }

// Neutral history → OpenAI wire shape. The assistant tool-call turn needs the
// full {id, type:'function', function:{name, arguments}} shape (omitting `type`
// 400s the next completion); the tool result needs `tool_call_id`.
export function toAzureMessages(history: Msg[]): Msg[] {
  return history.map((m) => {
    if (m.role === 'assistant' && Array.isArray(m.toolCalls)) {
      return {
        role: 'assistant',
        content: null,
        tool_calls: (m.toolCalls as { id: string; query: string }[]).map((c) => ({
          id: c.id,
          type: 'function',
          function: { name: 'search_notes', arguments: JSON.stringify({ query: c.query }) },
        })),
      }
    }
    if (m.role === 'tool') {
      return { role: 'tool', tool_call_id: m.id, content: m.content }
    }
    return m
  })
}

function env() {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT
  const key = process.env.AZURE_OPENAI_API_KEY
  const deployment = process.env.AZURE_OPENAI_CHAT_DEPLOYMENT
  if (!endpoint || !key || !deployment) throw new Error('chat_failed')
  return { url: `${endpoint.replace(/\/$/, '')}/chat/completions`, key, deployment }
}

export async function callAzure(
  history: Msg[],
  opts: { tools: boolean },
): Promise<ModelTurn & { usage?: Usage }> {
  const { url, key, deployment } = env()
  const body: Record<string, unknown> = { model: deployment, messages: toAzureMessages(history) }
  if (opts.tools) {
    body.tools = [SEARCH_NOTES_TOOL]
    body.tool_choice = 'auto'
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    console.error('[nuru chat azure]', res.status, await res.text().catch(() => ''))
    throw new Error('chat_failed')
  }
  const json = (await res.json()) as {
    choices?: { message?: { content?: string; tool_calls?: { id: string; function: { name: string; arguments: string } }[] } }[]
    usage?: { prompt_tokens?: number; completion_tokens?: number }
  }
  const msg = json.choices?.[0]?.message
  const toolCalls = (msg?.tool_calls ?? [])
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
    usage: json.usage
      ? { inputTokens: json.usage.prompt_tokens ?? 0, outputTokens: json.usage.completion_tokens ?? 0 }
      : undefined,
  }
}

// Streaming final answer. Yields { token } for each content delta, then one final
// { usage } value. Azure streams SSE lines "data: {json}\n\n"; the last data line
// before "[DONE]" with stream_options usage carries token counts.
export async function* streamAzure(
  history: Msg[],
): AsyncIterable<{ token?: string; usage?: Usage }> {
  const { url, key, deployment } = env()
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: deployment,
      messages: toAzureMessages(history),
      stream: true,
      stream_options: { include_usage: true },
    }),
  })
  if (!res.ok || !res.body) {
    console.error('[nuru chat azure stream]', res.status)
    throw new Error('chat_failed')
  }
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  let usage: Usage | undefined
  while (true) {
    const { done, value } = await reader.read()
    if (value) buf += decoder.decode(value, { stream: true })
    let nl: number
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl).trim()
      buf = buf.slice(nl + 1)
      if (!line.startsWith('data:')) continue
      const data = line.slice(5).trim()
      if (data === '[DONE]') continue
      let json: any
      try {
        json = JSON.parse(data)
      } catch {
        continue
      }
      const token = json.choices?.[0]?.delta?.content
      if (token) yield { token }
      if (json.usage) {
        usage = { inputTokens: json.usage.prompt_tokens ?? 0, outputTokens: json.usage.completion_tokens ?? 0 }
      }
    }
    if (done) break
  }
  yield { usage: usage ?? { inputTokens: 0, outputTokens: 0 } }
}
