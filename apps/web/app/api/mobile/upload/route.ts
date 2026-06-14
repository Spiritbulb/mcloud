// POST /api/mobile/upload — upload an image from the mobile app to Supabase Storage.
// Accepts multipart/form-data: { file, bucket, path }
// Returns { url: string } — the public URL of the uploaded file.
//
// Bucket must be 'store-assets' or 'product-images'.
// Path is caller-supplied, e.g. `${storeId}/logo` or `${storeId}/products/${productId}`.
// Auth: mobile bearer token required; store-scoped callers must verify access themselves
// before calling (the endpoint only checks that the user is authenticated).
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@mcloud/db/server'
import { requireMobileUser } from '../_lib'

const ALLOWED_BUCKETS = ['store-assets', 'product-images'] as const
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
const MAX_SIZE = 8 * 1024 * 1024 // 8 MB

export async function POST(req: NextRequest) {
    const auth = await requireMobileUser(req)
    if (auth instanceof NextResponse) return auth

    let formData: FormData
    try {
        formData = await req.formData()
    } catch {
        return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 })
    }

    const file = formData.get('file') as File | null
    const bucket = formData.get('bucket') as string | null
    const path = formData.get('path') as string | null

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (!bucket || !ALLOWED_BUCKETS.includes(bucket as (typeof ALLOWED_BUCKETS)[number])) {
        return NextResponse.json({ error: 'Invalid bucket' }, { status: 400 })
    }
    if (!path || path.length < 3 || path.includes('..')) {
        return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json({ error: 'Unsupported file type. Use JPEG, PNG, WebP, or HEIC.' }, { status: 400 })
    }
    if (file.size > MAX_SIZE) {
        return NextResponse.json({ error: 'File too large. Maximum is 8 MB.' }, { status: 400 })
    }

    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const filePath = `${path}.${ext}`

    const supabase = await createClient()
    const arrayBuffer = await file.arrayBuffer()

    const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, arrayBuffer, { contentType: file.type, upsert: true })

    if (uploadError) {
        console.error('[mobile upload]', uploadError.message)
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
    }

    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(filePath)
    const url = `${publicUrl}?t=${Date.now()}`

    return NextResponse.json({ url })
}
