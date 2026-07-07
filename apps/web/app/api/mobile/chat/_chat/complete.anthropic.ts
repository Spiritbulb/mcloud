// Anthropic (Claude Haiku 4.5) adapter. Translates the loop's neutral history
// into the Messages-API shape: system is a top-level param; the assistant tool
// call is a tool_use content block; the tool result is a USER message with a
// tool_result block; the tool schema is flat {name, description, input_schema}.
// Plain messages call — Haiku 4.5 takes no thinking/effort/temperature params.
import Anthropic from '@anthropic-ai/sdk'
import type { ModelTurn } from './loop'

export const ANTHROPIC_LABEL = 'Haiku 4.5'
const MODEL = 'claude-haiku-4-5'
const MAX_TOKENS = 4096

type Msg = Record<string, unknown>
type Usage = { inputTokens: number; outputTokens: number }

const ANTHROPIC_TOOL = {
  name: 'search_notes',
  description:
    "Search the student's own study notes (and the approved community pool) for " +
    'passages relevant to a query. Call this only when the question is about their ' +
    'coursework/notes; skip it for greetings, small talk, or general questions you ' +
    'can answer directly.',
  input_schema: {
    type: 'object',
    properties: { query: { type: 'string', description: 'What to look for in the notes.' } },
    required: ['query'],
  },
}

export function toAnthropicParams(history: Msg[]): { system: string; messages: Msg[]; tools: Msg[] } {
  let system = ''
  const messages: Msg[] = []
  for (const m of history) {
    if (m.role === 'system') {
      system = m.content as string
    } else if (m.role === 'user') {
      messages.push({ role: 'user', content: m.content })
    } else if (m.role === 'assistant' && Array.isArray(m.toolCalls)) {
      messages.push({
        role: 'assistant',
        content: (m.toolCalls as { id: string; query: string }[]).map((c) => ({
          type: 'tool_use',
          id: c.id,
          name: 'search_notes',
          input: { query: c.query },
        })),
      })
    } else if (m.role === 'tool') {
      messages.push({
        role: 'user',
        content: [{ type: 'tool_result', tool_use_id: m.id, content: m.content }],
      })
    }
  }
  return { system, messages, tools: [ANTHROPIC_TOOL] }
}

function client(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('chat_failed')
  return new Anthropic({ apiKey })
}

export async function callAnthropic(
  history: Msg[],
  opts: { tools: boolean },
): Promise<ModelTurn & { usage?: Usage }> {
  const { system, messages, tools } = toAnthropicParams(history)
  const res = await client().messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system,
    messages: messages as Anthropic.MessageParam[],
    ...(opts.tools ? { tools: tools as Anthropic.Tool[] } : {}),
  })
  let text: string | undefined
  const toolCalls: { id: string; query: string }[] = []
  for (const block of res.content) {
    if (block.type === 'text') text = (text ?? '') + block.text
    else if (block.type === 'tool_use' && block.name === 'search_notes') {
      const q = (block.input as { query?: string })?.query ?? ''
      toolCalls.push({ id: block.id, query: q })
    }
  }
  return {
    text,
    toolCalls: toolCalls.length ? toolCalls : undefined,
    usage: { inputTokens: res.usage.input_tokens, outputTokens: res.usage.output_tokens },
  }
}

// Streaming final answer. The final call never offers tools (the loop only
// streams the answer), so we stream text deltas and read usage from the final
// message. Yields { token } per delta, then one final { usage }.
export async function* streamAnthropic(
  history: Msg[],
): AsyncIterable<{ token?: string; usage?: Usage }> {
  const { system, messages } = toAnthropicParams(history)
  const stream = client().messages.stream({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system,
    messages: messages as Anthropic.MessageParam[],
  })
  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      yield { token: event.delta.text }
    }
  }
  const final = await stream.finalMessage()
  yield { usage: { inputTokens: final.usage.input_tokens, outputTokens: final.usage.output_tokens } }
}
