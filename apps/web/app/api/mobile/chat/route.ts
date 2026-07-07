// /api/mobile/chat — tool-calling chat over the student's notes + general knowledge.
// POST { text, contextNoteIds? }: streams live status (thinking/searching_notes/
//   writing) then a final message. The model calls search_notes on demand (Azure
//   function-calling); retrieval is "me OR approved" via match_nuru_chunks. Persists
//   user+assistant rows and keeps the sessions slice (title/updated_at) working.
// GET: the student's chat history (own user_id only).
// Auth: mobile bearer; every query scoped to auth.user.id.
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@mcloud/db/server'
import { requireMobileUser } from '../_lib'
import { streamingResponse } from './_stream'
import { runChat } from './_chat/loop'
import { pickAdapter } from './_chat/adapters'
import { searchNotes } from './_chat/searchNotes'
import { deriveTitle, isUuid } from './_sessions'

type ChatRow = {
    id: string
    role: 'user' | 'assistant'
    text: string
    context_note_ids: string[]
    created_at: string
}

function toMessage(row: ChatRow) {
    return {
        id: row.id,
        role: row.role,
        text: row.text,
        contextNoteIds: row.context_note_ids ?? [],
        createdAt: row.created_at,
    }
}

export async function GET(req: NextRequest) {
    const auth = await requireMobileUser(req)
    if (auth instanceof NextResponse) return auth
    const userId = auth.user.id

    const sessionId = req.nextUrl.searchParams.get('sessionId')
    // A missing or malformed sessionId (incl. the literal "undefined" the client
    // can send) is simply "no such thread" — return empty, never let it hit the
    // uuid column and 500.
    if (!isUuid(sessionId)) return NextResponse.json({ messages: [] })

    const supabase = await createClient()
    const { data, error } = await supabase
        .from('nuru_chat_messages')
        .select('id, role, text, context_note_ids, created_at')
        .eq('user_id', userId)          // ownership
        .eq('session_id', sessionId)    // thread scope
        .order('created_at', { ascending: true })
    if (error) {
        console.error('[nuru chat history]', error.message)
        return NextResponse.json({ error: 'Could not load history' }, { status: 500 })
    }
    return NextResponse.json({ messages: (data as ChatRow[]).map(toMessage) })
}

export async function POST(req: NextRequest) {
    const auth = await requireMobileUser(req)
    if (auth instanceof NextResponse) return auth
    const userId = auth.user.id

    let body: { text?: string; contextNoteIds?: string[]; sessionId?: string; provider?: string }
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: 'Expected JSON body' }, { status: 400 })
    }
    const text = (body.text ?? '').trim()
    if (!text) return NextResponse.json({ error: 'Empty message' }, { status: 400 })
    const sessionId = body.sessionId
    if (!isUuid(sessionId)) return NextResponse.json({ error: 'Missing or invalid sessionId' }, { status: 400 })

    const supabase = await createClient()

    // Verify the session belongs to this user before doing any work.
    const { data: sess } = await supabase
        .from('nuru_chat_sessions')
        .select('id, title')
        .eq('id', sessionId)
        .eq('user_id', userId)
        .maybeSingle()
    if (!sess) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

    // If the student is chatting "about a note", pass its title so the model can
    // bias its search toward it. Scoped to the owner so we never leak a title.
    const focusNoteId =
        Array.isArray(body.contextNoteIds) && body.contextNoteIds.length ? body.contextNoteIds[0] : undefined
    const noteInFocus = focusNoteId
        ? (
              await supabase
                  .from('nuru_notes')
                  .select('title')
                  .eq('id', focusNoteId)
                  .eq('uploader_id', userId)
                  .maybeSingle()
          ).data?.title ?? undefined
        : undefined

    const { adapter, provider } = pickAdapter(body.provider)

    return streamingResponse(async (emit) => {
        let answer: string
        let noteIds: string[]
        let usage: { inputTokens: number; outputTokens: number } | undefined
        try {
            const out = await runChat({
                userText: text,
                noteInFocus,
                callModel: adapter.callModel,
                search: (q) => searchNotes(supabase, userId, q),
                emit: (value) => emit({ type: 'status', value }),
                streamAnswer: adapter.streamAnswer,
                onToken: (token) => emit({ type: 'token', value: token }),
            })
            answer = out.answer
            noteIds = out.noteIds
            usage = out.usage
        } catch {
            emit({ type: 'error', error: 'The assistant is unavailable' })
            return
        }

        // Persist user + assistant rows (unchanged shape; sessions slice preserved).
        const { error: insErr } = await supabase.from('nuru_chat_messages').insert([
            { user_id: userId, session_id: sessionId, role: 'user', text, context_note_ids: [] },
            { user_id: userId, session_id: sessionId, role: 'assistant', text: answer, context_note_ids: noteIds },
        ])
        if (insErr) {
            console.error('[nuru chat insert]', insErr.message)
            emit({ type: 'error', error: 'Answered but could not save history' })
            return
        }

        // Auto-title on the first user message + bump updated_at (sessions slice).
        const patch: { updated_at: string; title?: string } = { updated_at: new Date().toISOString() }
        if (!sess.title) patch.title = deriveTitle(text)
        await supabase.from('nuru_chat_sessions').update(patch).eq('id', sessionId).eq('user_id', userId)

        // Re-read the saved assistant row for its server id/timestamp.
        const { data: saved } = await supabase
            .from('nuru_chat_messages')
            .select('id, role, text, context_note_ids, created_at')
            .eq('user_id', userId)
            .eq('session_id', sessionId)
            .eq('role', 'assistant')
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

        emit({
            type: 'done',
            message: saved
                ? toMessage(saved as ChatRow)
                : { id: '', role: 'assistant', text: answer, contextNoteIds: noteIds, createdAt: new Date().toISOString() },
            meta: { model: adapter.label, provider, usage: usage ?? { inputTokens: 0, outputTokens: 0 } },
        })
    })
}
