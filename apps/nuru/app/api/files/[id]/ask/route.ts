// @route-kind: user
// POST /api/files/:id/ask { page, question } -> { answer, page } | { error }
// One answer about one page, cited. Not a chat: nothing about earlier questions is sent.
import { NextResponse, type NextRequest } from 'next/server'
import { ASK_LIMIT_PER_DAY, parseAsk } from '@/lib/ai/ask-logic'
import { answerAboutPage } from '@/lib/ai/claude'
import { getFile, getPage, reserveAsk } from '@/lib/files/queries'
import { isFileId } from '@/lib/files/upload-logic'
import { requireUser } from '@/lib/session'

export const maxDuration = 120

const NO_STORE = { 'Cache-Control': 'no-store' }

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(req)
  if (user instanceof NextResponse) return user
  const { id } = await params
  const file = isFileId(id) ? await getFile(user.id, id) : null
  if (!file) return NextResponse.json({ error: 'File not found' }, { status: 404, headers: NO_STORE })
  // Ready files, and failed files whose text was extracted (e.g. notes failed), can be asked about.
  const pageCount = file.pages ?? 0
  if ((file.status !== 'ready' && file.status !== 'failed') || pageCount <= 0) {
    return NextResponse.json({ error: "Nuru can't answer questions about this file yet." }, { status: 409, headers: NO_STORE })
  }

  const body = await req.json().catch(() => null)
  const parsed = parseAsk(body, pageCount)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400, headers: NO_STORE })
  const { page, question } = parsed.value

  // Reserve the slot before calling the model, so concurrent asks cannot exceed the limit.
  // A failed or refused call keeps its slot.
  if (!(await reserveAsk(user.id, file.id, page, ASK_LIMIT_PER_DAY))) {
    return NextResponse.json({ error: "You've reached today's question limit." }, { status: 429, headers: NO_STORE })
  }

  const pageText = await getPage(user.id, file.id, page)
  if (pageText == null) {
    return NextResponse.json({ error: "Nuru can't answer questions about this file yet." }, { status: 409, headers: NO_STORE })
  }
  try {
    const answer = await answerAboutPage(page, pageText, question)
    return NextResponse.json({ answer, page }, { headers: NO_STORE })
  } catch (err) {
    console.error('[nuru] ask failed', file.id, err)
    return NextResponse.json({ error: "Nuru couldn't answer that right now. Please try again." }, { status: 502, headers: NO_STORE })
  }
}
