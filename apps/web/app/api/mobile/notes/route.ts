// POST /api/mobile/notes — create a note and ingest it into the KB.
// multipart/form-data: source ('text'|'file'|'photo'), title?, subject?,
//   text? (for source='text'), file? (for 'file'|'photo').
// Pipeline: store original (file/photo) → extractText → chunk → embed → insert.
// The note is answerable to its uploader immediately; status='pending' gates
// community sharing. Auth: mobile bearer token; scoped to auth.user.id.
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@mcloud/db/server'
import { requireMobileUser } from '../_lib'
import { chunk } from './_ingest/chunk'
import { extractText } from './_ingest/extract'
import { embed } from './_ingest/embed'

const MAX_SIZE = 8 * 1024 * 1024 // 8 MB, matches existing upload route
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
const FILE_TYPES = [...IMAGE_TYPES, 'application/pdf']

export async function GET(req: NextRequest) {
    const auth = await requireMobileUser(req)
    if (auth instanceof NextResponse) return auth
    const userId = auth.user.id

    const supabase = await createClient()
    const { data, error } = await supabase
        .from('nuru_notes')
        .select('id, title, subject, source, original_content, file_url, status, created_at')
        .eq('uploader_id', userId)
        .order('created_at', { ascending: false })
    if (error) {
        console.error('[nuru notes list]', error.message)
        return NextResponse.json({ error: 'Could not load notes' }, { status: 500 })
    }
    return NextResponse.json({ notes: data ?? [] })
}

export async function POST(req: NextRequest) {
    const auth = await requireMobileUser(req)
    if (auth instanceof NextResponse) return auth
    const userId = auth.user.id

    let form: FormData
    try {
        form = await req.formData()
    } catch {
        return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 })
    }

    const source = form.get('source') as string | null
    const title = (form.get('title') as string | null) ?? null
    const subject = (form.get('subject') as string | null) ?? null
    if (!source || !['text', 'file', 'photo'].includes(source)) {
        return NextResponse.json({ error: 'Invalid source' }, { status: 400 })
    }

    const supabase = await createClient()
    let content = ''
    let fileUrl: string | null = null

    if (source === 'text') {
        content = ((form.get('text') as string | null) ?? '').trim()
        if (!content) return NextResponse.json({ error: 'Empty text' }, { status: 400 })
    } else {
        const file = form.get('file') as File | null
        if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
        if (file.size > MAX_SIZE) {
            return NextResponse.json({ error: 'File too large (max 8 MB)' }, { status: 400 })
        }
        if (!FILE_TYPES.includes(file.type)) {
            return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 })
        }
        const bytes = await file.arrayBuffer()

        // Store the original in the private bucket. Supabase Storage object keys
        // reject characters like '|', which Auth0 user ids contain (e.g.
        // 'auth0|abc'), so sanitize the id for the path only — the DB keeps the
        // real uploader_id.
        const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
        const safeUserId = userId.replace(/[^a-zA-Z0-9._-]/g, '_')
        const path = `${safeUserId}/${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage
            .from('nuru-notes')
            .upload(path, bytes, { contentType: file.type, upsert: false })
        if (upErr) {
            console.error('[nuru notes upload]', upErr.message)
            return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
        }
        fileUrl = path

        // Extract text (OCR / PDF read).
        try {
            content = await extractText(bytes, file.type)
        } catch {
            return NextResponse.json({ error: 'Could not read the file' }, { status: 422 })
        }
        if (!content) {
            return NextResponse.json({ error: 'No text found in file' }, { status: 422 })
        }
    }

    // Insert the note (answerable to uploader immediately; pending for community).
    const { data: note, error: noteErr } = await supabase
        .from('nuru_notes')
        .insert({
            uploader_id: userId,
            title,
            subject,
            source,
            original_content: content,
            file_url: fileUrl,
            status: 'pending',
            extraction_status: 'done',
        })
        .select()
        .single()
    if (noteErr || !note) {
        console.error('[nuru notes insert]', noteErr?.message)
        return NextResponse.json({ error: 'Could not save note' }, { status: 500 })
    }

    // Chunk + embed + store chunks.
    const pieces = chunk(content)
    if (pieces.length > 0) {
        let vectors: number[][]
        try {
            vectors = await embed(pieces)
        } catch {
            return NextResponse.json({ error: 'Could not index note' }, { status: 422 })
        }
        const rows = pieces.map((c, i) => ({
            note_id: note.id,
            chunk_index: i,
            content: c,
            embedding: JSON.stringify(vectors[i]), // pgvector accepts the JSON array text form
            uploader_id: userId,
            status: 'pending',
        }))
        const { error: chunkErr } = await supabase.from('nuru_note_chunks').insert(rows)
        if (chunkErr) {
            console.error('[nuru chunks insert]', chunkErr.message)
            return NextResponse.json({ error: 'Could not index note' }, { status: 500 })
        }
    }

    return NextResponse.json({ note }, { status: 201 })
}
