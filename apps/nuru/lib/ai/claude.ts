import 'server-only'
import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { StudyOutputSchema, WhySchema, type StudyOutput } from './schema'

export const MODEL = 'claude-opus-5-5'

const SYSTEM = `You write study notes and practice questions for a university student, drawn only from the document they give you.

The document arrives as <page n="…"> blocks. For every note point, question and answer, cite the page numbers it comes from in "pages", using those n values.

Use only what the document says. Do not add facts that are not in it, and do not predict exam questions, grades or outcomes. Group the notes under short headings that follow the document's own structure. Write questions that test understanding of the material, with answers taken from the document.`

const ASK_SYSTEM = `You answer a university student's question about one page of their document, using only that page.

The page arrives as a <page n="…"> block, followed by the question. Answer from what the page says, in a few short sentences. If the page does not cover the question, say that this page doesn't cover it rather than answering from outside knowledge. Do not predict exam questions, grades or outcomes. End the answer with the page citation in the form (p. N), using the page's n value.`

const WHY_SYSTEM = `You write one short line for each news item in a feed read by Kenyan university students.

Each item arrives as an <item id="…" source="…"> block with a title and summary. For each item, write one plain sentence saying why it matters to a Kenyan university student, using only the title and summary. Do not predict, speculate, or add facts that are not in the title or summary. If the summary does not support a sentence, return null for that item. Return every id you were given, and no others.`

let cached: Anthropic | null = null

function client(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set')
  cached ??= new Anthropic()
  return cached
}

export async function generateStudyOutput(docText: string): Promise<StudyOutput> {
  const res = await client().beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: SYSTEM,
    messages: [{ role: 'user', content: docText }],
    output_config: { effort: 'medium', format: zodOutputFormat(StudyOutputSchema) },
  })
  if (res.stop_reason === 'refusal') throw new Error(`model refused (${res.stop_details?.category ?? 'unknown'})`)
  if (!res.parsed_output) throw new Error(`no parsed output (stop_reason ${res.stop_reason})`)
  return res.parsed_output
}

/** One answer to one question, drawn only from the given page. Not a conversation. */
export async function answerAboutPage(page: number, pageText: string, question: string): Promise<string> {
  const res = await client().beta.messages.create({
    model: MODEL,
    max_tokens: 4000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: ASK_SYSTEM,
    messages: [{ role: 'user', content: `<page n="${page}">${pageText}</page>\n\n<question>${question}</question>` }],
    output_config: { effort: 'low' },
  })
  if (res.stop_reason === 'refusal') throw new Error(`model refused (${res.stop_details?.category ?? 'unknown'})`)
  const text = res.content
    .flatMap((b) => (b.type === 'text' ? [b.text] : []))
    .join('')
    .trim()
  if (!text) throw new Error(`no answer (stop_reason ${res.stop_reason})`)
  return text
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** One call for a batch of new feed items. Callers must treat failure as non-fatal. */
export async function whyItMatters(
  items: { id: number; title: string; summary: string; source: string }[],
): Promise<{ id: number; why: string | null }[]> {
  if (items.length === 0) return []
  const content = items
    .map((i) => `<item id="${i.id}" source="${esc(i.source)}"><title>${esc(i.title)}</title><summary>${esc(i.summary)}</summary></item>`)
    .join('\n')
  const res = await client().beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: WHY_SYSTEM,
    messages: [{ role: 'user', content }],
    output_config: { effort: 'low', format: zodOutputFormat(WhySchema) },
  })
  if (res.stop_reason === 'refusal') throw new Error(`model refused (${res.stop_details?.category ?? 'unknown'})`)
  if (!res.parsed_output) throw new Error(`no parsed output (stop_reason ${res.stop_reason})`)
  return res.parsed_output.items
}
