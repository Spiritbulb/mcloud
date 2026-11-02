// @route-kind: user
// POST /api/files/:id/ask { page, question } -> { answer, page } | { error }
// One answer about one page, cited. Not a chat: nothing about earlier questions is sent.
import { NextResponse, type NextRequest } from 'next/server'
import { ASK_LIMIT_PER_DAY, parseAsk } from '@/lib/ai/ask-logic'
import { answerAboutPage } from '@/lib/ai/claude'
import { countRecentAsks, getFile, getPages, recordAsk } from '@/lib/files/queries'
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
  const pages = file.status === 'ready' || file.status === 'failed' ? await getPages(user.id, file.id) : []
  if (pages.length === 0) {
    return NextResponse.json({ error: "Nuru can't answer questions about this file yet." }, { status: 409, headers: NO_STORE })
  }

  const body = await req.json().catch(() => null)
  const parsed = parseAsk(body, pages.length)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400, headers: NO_STORE })
  if ((await countRecentAsks(user.id)) >= ASK_LIMIT_PER_DAY) {
    return NextResponse.json({ error: "You've reached today's question limit." }, { status: 429, headers: NO_STORE })
  }

  const { page, question } = parsed.value
  let answer: string
  try {
    answer = await answerAboutPage(page, pages[page - 1], question)
  } catch (err) {
    console.error('[nuru] ask failed', file.id, err)
    return NextResponse.json({ error: "Nuru couldn't answer that right now. Please try again." }, { status: 502, headers: NO_STORE })
  }
  await recordAsk(user.id, file.id, page)
  return NextResponse.json({ answer, page }, { headers: NO_STORE })
}
