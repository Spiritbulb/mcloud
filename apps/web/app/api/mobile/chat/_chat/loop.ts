// Pure tool-calling loop. Drives an injected model; when the model calls
// search_notes, runs the injected search and feeds results back, up to a cap.
// Emits status values via the injected emit. No I/O of its own — fully testable.
// (The SEARCH_NOTES_TOOL schema is consumed by complete.ts, not here — the loop
// only assembles messages and reacts to normalized ModelTurns.)
import { buildSystemPrompt } from './prompt'

export type ModelTurn = {
  toolCalls?: { id: string; query: string }[]
  text?: string
}

type Msg = Record<string, unknown>

export type RunDeps = {
  userText: string
  noteInFocus?: string
  callModel: (messages: Msg[], opts: { tools: boolean }) => Promise<ModelTurn>
  search: (query: string) => Promise<{ chunks: { content: string }[]; noteIds: string[] }>
  emit: (value: 'thinking' | 'searching_notes' | 'writing') => void
}

const MAX_SEARCHES = 3
const MAX_CALLS = 4

export async function runChat(deps: RunDeps): Promise<{ answer: string; noteIds: string[] }> {
  const { userText, noteInFocus, callModel, search, emit } = deps
  const messages: Msg[] = [
    { role: 'system', content: buildSystemPrompt(noteInFocus ? { noteInFocus } : undefined) },
    { role: 'user', content: userText },
  ]
  const noteIds = new Set<string>()
  let searches = 0
  let calls = 0

  while (true) {
    // Tools are offered only while there is budget for BOTH another search AND a
    // follow-up model call to consume its results (calls must stay < MAX_CALLS-1
    // so a final answer-only call still fits within MAX_CALLS).
    const toolsAllowed = searches < MAX_SEARCHES && calls < MAX_CALLS - 1
    emit(calls === 0 ? 'thinking' : 'writing')
    const turn = await callModel(messages, { tools: toolsAllowed })
    calls++

    const wantsSearch = toolsAllowed && !!turn.toolCalls && turn.toolCalls.length > 0
    if (!wantsSearch) {
      // Final answer. If the model returned text, use it. If it returned no text
      // (e.g. it emitted a tool call we couldn't honor because tools were off),
      // and we still have call budget, force one text-only call; otherwise answer
      // with whatever text we have ('' at worst) — never exceed MAX_CALLS.
      if (turn.text != null) {
        emit('writing')
        return { answer: turn.text, noteIds: [...noteIds] }
      }
      if (calls < MAX_CALLS) {
        emit('writing')
        const forced = await callModel(messages, { tools: false })
        calls++
        return { answer: forced.text ?? '', noteIds: [...noteIds] }
      }
      return { answer: '', noteIds: [...noteIds] }
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
