// Pure tool-calling loop. Drives an injected model; when the model calls
// search_notes, runs the injected search and feeds results back, up to a cap.
// Emits status values via the injected emit. No I/O of its own — fully testable.
// (The SEARCH_NOTES_TOOL schema is consumed by complete.ts, not here — the loop
// only assembles messages and reacts to normalized ModelTurns.)
import { buildSystemPrompt } from './prompt'

export type Usage = { inputTokens: number; outputTokens: number }

export type ModelTurn = {
  toolCalls?: { id: string; query: string }[]
  text?: string
  usage?: Usage
}

type Msg = Record<string, unknown>

export type RunDeps = {
  userText: string
  noteInFocus?: string
  callModel: (messages: Msg[], opts: { tools: boolean }) => Promise<ModelTurn>
  search: (query: string) => Promise<{ chunks: { content: string }[]; noteIds: string[] }>
  emit: (value: 'thinking' | 'searching_notes' | 'writing') => void
  // Final-answer streaming: yields { token } deltas then a final { usage }.
  streamAnswer: (messages: Msg[]) => AsyncIterable<{ token?: string; usage?: Usage }>
  onToken: (token: string) => void
}

const MAX_SEARCHES = 3
const MAX_CALLS = 4

export async function runChat(deps: RunDeps): Promise<{ answer: string; noteIds: string[]; usage?: Usage }> {
  const { userText, noteInFocus, callModel, search, emit, streamAnswer, onToken } = deps
  const messages: Msg[] = [
    { role: 'system', content: buildSystemPrompt(noteInFocus ? { noteInFocus } : undefined) },
    { role: 'user', content: userText },
  ]
  const noteIds = new Set<string>()
  let searches = 0
  let calls = 0
  const toolUsage: Usage = { inputTokens: 0, outputTokens: 0 }

  // Stream the final answer from the adapter, forwarding tokens to onToken and
  // accumulating the full text (for persistence) + usage (for the done frame).
  async function streamFinal(): Promise<{ answer: string; usage?: Usage }> {
    emit('writing')
    let answer = ''
    let usage: Usage | undefined
    for await (const part of streamAnswer(messages)) {
      if (part.token) {
        answer += part.token
        onToken(part.token)
      }
      if (part.usage) usage = part.usage
    }
    return { answer, usage }
  }

  while (true) {
    // Tools are offered only while there is budget for BOTH another search AND a
    // follow-up model call to consume its results (calls must stay < MAX_CALLS-1
    // so a final answer-only call still fits within MAX_CALLS).
    const toolsAllowed = searches < MAX_SEARCHES && calls < MAX_CALLS - 1
    emit(calls === 0 ? 'thinking' : 'writing')
    const turn = await callModel(messages, { tools: toolsAllowed })
    calls++
    if (turn.usage) {
      toolUsage.inputTokens += turn.usage.inputTokens
      toolUsage.outputTokens += turn.usage.outputTokens
    }

    const wantsSearch = toolsAllowed && !!turn.toolCalls && turn.toolCalls.length > 0
    if (!wantsSearch) {
      // Final answer is always streamed. Whether the last non-streamed call
      // returned text or not, we stream a fresh answer-only completion so the
      // user sees tokens arrive. (The prior turn's text, if any, was a signal
      // the model is done searching, not the answer to render.)
      const { answer, usage: streamedUsage } = await streamFinal()
      const usage: Usage = {
        inputTokens: toolUsage.inputTokens + (streamedUsage?.inputTokens ?? 0),
        outputTokens: toolUsage.outputTokens + (streamedUsage?.outputTokens ?? 0),
      }
      return { answer, noteIds: [...noteIds], usage }
    }

    // Record the assistant tool-call turn in the loop's NEUTRAL shape. Each
    // provider adapter (Task 3) translates this to its own wire shape; the loop
    // never bakes in a provider format.
    messages.push({ role: 'assistant', toolCalls: turn.toolCalls! })
    for (const call of turn.toolCalls!) {
      emit('searching_notes')
      searches++
      let content = ''
      try {
        const { chunks, noteIds: got } = await search(call.query)
        got.forEach((id) => noteIds.add(id))
        content = chunks.map((c, i) => `[${i + 1}] ${c.content}`).join('\n\n') || '(no matching notes)'
      } catch {
        content = '(notes unavailable — answer from general knowledge)'
      }
      messages.push({ role: 'tool', id: call.id, content })
    }
  }
}
