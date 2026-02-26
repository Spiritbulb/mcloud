'use client'

import { useEffect } from 'react'
import { Dropzone, DropzoneContent, DropzoneEmptyState } from '@/components/dropzone'
import { useSupabaseUpload } from '@/hooks/use-supabase-upload'
import { createClient } from '@/lib/client'
import { X } from 'lucide-react'

interface ImageUploadProps {
    value: string
    onChange: (url: string) => void
    bucket?: 'store-assets' | 'product-images'
    path: string
    label?: string
    aspectRatio?: 'square' | 'wide'
}

export default function ImageUpload({
    value,
    onChange,
    bucket = 'store-assets',
    path,
    label,
    aspectRatio = 'square',
}: ImageUploadProps) {
    const uploadProps = useSupabaseUpload({
        bucketName: bucket,
        path: `${path}_${Date.now()}`, // unique path every upload session
        allowedMimeTypes: ['image/*'],
        maxFiles: 1,
        maxFileSize: 1000 * 1000 * 5,
    })


    // isSuccess = all files uploaded successfully
    // successes = array of file name strings e.g. ["photo.png"]
    useEffect(() => {
        if (uploadProps.isSuccess && uploadProps.successes.length > 0) {
            const fileName = uploadProps.successes[0]
            const supabase = createClient()
            const { data } = supabase.storage
                .from(bucket)
                .getPublicUrl(`${path}/${fileName}`)
            if (data?.publicUrl) {
                onChange(data.publicUrl)
            }
        }
    }, [uploadProps.isSuccess])

    return (
        <div className="space-y-2 max-w-sm">
            {label && <p className="text-sm font-medium">{label}</p>}

            {/* Show current image if we have one and no active upload session */}
            {value && !uploadProps.isSuccess && uploadProps.files.length === 0 ? (
                <div className={`relative border ${aspectRatio === 'wide' ? 'aspect-video w-full' : 'aspect-square w-32'
                    }`}>
                    <img src={value} alt={label ?? 'Image'} className="object-cover" />
                    <button
                        type="button"
                        onClick={() => onChange('')}
                        className="absolute top-1 right-1 bg-background border p-0.5 hover:bg-destructive hover:text-white transition-colors z-10"
                    >
                        <X className="w-3 h-3" />
                    </button>
                </div>
            ) : (
                <div className={aspectRatio === 'wide' ? 'aspect-video w-full' : 'aspect-square w-48'}>
                    <Dropzone {...uploadProps}>
                        <DropzoneEmptyState />
                        <DropzoneContent />
                    </Dropzone>
                </div>
            )}
        </div>
    )
}
