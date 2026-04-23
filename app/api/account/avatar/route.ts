import { auth0 } from '@/lib/auth0'
import { createClient } from '@/lib/server'
import { NextResponse, NextRequest } from 'next/server'

const BUCKET = 'avatars'
const MAX_SIZE = 5 * 1024 * 1024 // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

// POST /api/account/avatar
export async function POST(request: NextRequest) {
    const session = await auth0.getSession(request)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) return NextResponse.json({ error: 'No file provided.' }, { status: 400 })
    if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json({ error: 'Invalid file type. Use JPEG, PNG, WebP, or GIF.' }, { status: 400 })
    }
    if (file.size > MAX_SIZE) {
        return NextResponse.json({ error: 'File too large. Maximum size is 5 MB.' }, { status: 400 })
    }

    const userId = session.user.sub
    const ext = file.type.split('/')[1].replace('jpeg', 'jpg')
    const path = `${userId}/avatar.${ext}`

    const supabase = await createClient()
    const arrayBuffer = await file.arrayBuffer()

    const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, arrayBuffer, {
            contentType: file.type,
            upsert: true, // overwrite any existing avatar
        })

    if (uploadError) {
        console.error('[avatar upload]', uploadError.message)
        return NextResponse.json({ error: 'Upload failed.' }, { status: 500 })
    }

    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)

    // Bust the CDN cache by appending a timestamp query param
    const url = `${publicUrl}?t=${Date.now()}`

    // Persist the new URL to the users table
    await supabase
        .from('users')
        .update({ avatar_url: publicUrl }) // store without cache-buster
        .eq('id', userId)

    return NextResponse.json({ url })
}