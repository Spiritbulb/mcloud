// GET /api/mobile/notes/[id] — one note (owner only) + a signed URL for the private original.
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@mcloud/db/server'
import { requireMobileUser } from '../../_lib'

const SIGNED_URL_TTL = 60 * 60 // 1 hour

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const auth = await requireMobileUser(req)
    if (auth instanceof NextResponse) return auth
    const userId = auth.user.id
    const { id } = await params

    const supabase = await createClient()
    const { data: note, error } = await supabase
        .from('nuru_notes')
        .select('id, title, subject, source, original_content, file_url, status, created_at')
        .eq('id', id)
        .eq('uploader_id', userId)
        .single()
    if (error || !note) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    let signedUrl: string | null = null
    if (note.file_url) {
        const { data: signed } = await supabase.storage
            .from('nuru-notes')
            .createSignedUrl(note.file_url, SIGNED_URL_TTL)
        signedUrl = signed?.signedUrl ?? null
    }

    return NextResponse.json({ note: { ...note, signedUrl } })
}
