import 'server-only'
import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { StudyOutputSchema, type StudyOutput } from './schema'

export const MODEL = 'claude-opus-5-5'

const SYSTEM = `You write study notes and practice questions for a university student, drawn only from the document they give you.

The document arrives as <page n="…"> blocks. For every note point, question and answer, cite the page numbers it comes from in "pages", using those n values.

Use only what the document says. Do not add facts that are not in it, and do not predict exam questions, grades or outcomes. Group the notes under short headings that follow the document's own structure. Write questions that test understanding of the material, with answers taken from the document.`

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
