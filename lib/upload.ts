import { createClient } from '@/lib/client'

type Bucket = 'store-assets' | 'product-images'

export async function uploadImage(
    file: File,
    bucket: Bucket,
    path: string // e.g. `${storeId}/logo`
): Promise<string> {
    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const filePath = `${path}.${ext}`

    const { error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, { upsert: true })

    if (error) throw error

    const { data } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath)

    return data.publicUrl
}
