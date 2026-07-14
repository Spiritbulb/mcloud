// Notes-as-reference system prompt + the search_notes tool schema. Notes are a
// reference the model MAY consult (via the tool) when a question is about the
// student's coursework — not a cage. General knowledge is allowed when the notes
// don't cover the question. (Guardrails are a separate later pass.)

export function buildSystemPrompt(opts?: { noteInFocus?: string }): string {
  const base =
    'You are Nuru, a warm, concise study companion for students. ' +
    'When a question is about the student’s own coursework or notes, use the ' +
    'search_notes tool to consult their notes, and prefer that material when it is ' +
    'relevant. You may also answer from your general knowledge when their notes do ' +
    'not cover the question. Do not fabricate citations to notes you did not ' +
    'retrieve. Be clear and encouraging.'
  const hint = opts?.noteInFocus
    ? ` The student is currently focused on the note titled “${opts.noteInFocus}”; ` +
      'bias your search toward it when relevant.'
    : ''
  return base + hint
}

export const SEARCH_NOTES_TOOL = {
  type: 'function',
  function: {
    name: 'search_notes',
    description:
      "Search the student's own study notes (and the approved community pool) for " +
      'passages relevant to a query. Call this only when the question is about their ' +
      'coursework/notes; skip it for greetings, small talk, or general questions you ' +
      'can answer directly.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'What to look for in the notes.' },
      },
      required: ['query'],
    },
  },
} as const
