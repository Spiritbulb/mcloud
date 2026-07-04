// /api/mobile/chat — RAG chat over the student's notes + the approved community pool.
// POST { text, contextNoteIds? }: embed question → match_nuru_chunks (me OR approved)
//   → GPT-5 → persist user+assistant rows → return assistant message.
// GET: the student's chat history (own user_id only).
// Auth: mobile bearer; every query scoped to auth.user.id.
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@mcloud/db/server'
import { requireMobileUser } from '../_lib'
import { embed } from '../notes/_ingest/embed'
import { chatComplete } from './_chat/complete'
import { deriveTitle } from './_sessions'

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
    if (!sessionId) return NextResponse.json({ messages: [] })

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

    let body: { text?: string; contextNoteIds?: string[]; sessionId?: string }
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: 'Expected JSON body' }, { status: 400 })
    }
    const text = (body.text ?? '').trim()
    if (!text) return NextResponse.json({ error: 'Empty message' }, { status: 400 })
    const sessionId = body.sessionId
    if (!sessionId) return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })

    const supabase = await createClient()

    // Verify the session belongs to this user before doing any work.
    const { data: sess } = await supabase
        .from('nuru_chat_sessions')
        .select('id, title')
        .eq('id', sessionId)
        .eq('user_id', userId)
        .maybeSingle()
    if (!sess) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

    // 1. Embed the question.
    let queryVec: number[]
    try {
        ;[queryVec] = await embed([text])
    } catch {
        return NextResponse.json({ error: 'Could not process question' }, { status: 422 })
    }

    // 2. Retrieve chunks — "my notes OR approved" is enforced inside the RPC.
    const { data: matches, error: matchErr } = await supabase.rpc('match_nuru_chunks', {
        p_user_id: userId,
        p_query_embedding: JSON.stringify(queryVec), // pgvector accepts the JSON array text form
        p_match_count: 8,
    })
    if (matchErr) {
        console.error('[nuru chat match]', matchErr.message)
        return NextResponse.json({ error: 'Could not search notes' }, { status: 500 })
    }
    const chunks = (matches ?? []) as { note_id: string; content: string; similarity: number }[]
    const noteIds = [...new Set(chunks.map((c) => c.note_id))]

    // 3. Answer with GPT-5.
    let answer: string
    try {
        answer = await chatComplete(text, chunks)
    } catch {
        return NextResponse.json({ error: 'The assistant is unavailable' }, { status: 502 })
    }

    // 4. Persist user + assistant rows.
    const { error: insErr } = await supabase.from('nuru_chat_messages').insert([
        { user_id: userId, session_id: sessionId, role: 'user', text, context_note_ids: [] },
        { user_id: userId, session_id: sessionId, role: 'assistant', text: answer, context_note_ids: noteIds },
    ])
    if (insErr) {
        console.error('[nuru chat insert]', insErr.message)
        // Non-fatal for the reply, but surface it.
        return NextResponse.json({ error: 'Answered but could not save history' }, { status: 500 })
    }

    // Auto-title on the first user message; always bump updated_at for ordering.
    const patch: { updated_at: string; title?: string } = { updated_at: new Date().toISOString() }
    if (!sess.title) patch.title = deriveTitle(text)
    await supabase.from('nuru_chat_sessions').update(patch).eq('id', sessionId).eq('user_id', userId)

    // Return the assistant message (re-read to get server id/timestamp).
    const { data: saved } = await supabase
        .from('nuru_chat_messages')
        .select('id, role, text, context_note_ids, created_at')
        .eq('user_id', userId)
        .eq('session_id', sessionId)
        .eq('role', 'assistant')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

    return NextResponse.json(
        { message: saved ? toMessage(saved as ChatRow) : { id: '', role: 'assistant', text: answer, contextNoteIds: noteIds, createdAt: new Date().toISOString() } },
        { status: 201 },
    )
}
