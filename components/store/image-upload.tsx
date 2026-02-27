'use client'

import { useEffect, useRef } from 'react'
import { Dropzone, DropzoneContent, DropzoneEmptyState } from '@/components/dropzone'
import { useSupabaseUpload } from '@/hooks/use-supabase-upload'
import { createClient } from '@/lib/client'
import { X } from 'lucide-react'

interface ImageUploadProps {
    value: string
    pathInDb?: string
    onChange: (url: string, path: string) => void
    bucket?: 'store-assets' | 'product-images'
    pathPrefix: string   // e.g. `${store.id}/logo` — NO timestamp, hook stores as `pathPrefix/filename`
    label?: string
    aspectRatio?: 'square' | 'wide'
}

export default function ImageUpload({
    value,
    pathInDb,
    onChange,
    bucket = 'store-assets',
    pathPrefix,
    label,
    aspectRatio = 'square',
}: ImageUploadProps) {
    const supabase = createClient()
    const previousPathRef = useRef(pathInDb ?? '')
    const handledRef = useRef(false) // prevent double-fire

    const uploadProps = useSupabaseUpload({
        bucketName: bucket,
        path: pathPrefix,           // hook uploads to: `${pathPrefix}/${file.name}`
        allowedMimeTypes: ['image/*'],
        maxFiles: 1,
        maxFileSize: 5 * 1024 * 1024,
        upsert: true,               // overwrite same filename safely
    })

    useEffect(() => {
        // isSuccess flips to true once — guard against re-running
        if (!uploadProps.isSuccess || uploadProps.successes.length === 0 || handledRef.current) return
        handledRef.current = true

        const fileName = uploadProps.successes[0]           // e.g. "photo.webp"
        const fullPath = `${pathPrefix}/${fileName}`        // e.g. "storeId/logo/photo.webp"

        const run = async () => {
            try {
                // Delete previous file if path changed (different filename)
                const prevPath = previousPathRef.current
                if (prevPath && prevPath !== fullPath) {
                    await supabase.storage.from(bucket).remove([prevPath])
                }

                const { data } = supabase.storage.from(bucket).getPublicUrl(fullPath)
                if (data?.publicUrl) {
                    previousPathRef.current = fullPath
                    onChange(data.publicUrl, fullPath)
                }
            } catch (e) {
                console.error('Image upload post-process error', e)
            }
        }

        run()
    }, [uploadProps.isSuccess]) // only dep needed — successes is stable once isSuccess is true

    // Show existing image only when no active dropzone session
    const showExisting = !!value && !uploadProps.loading && uploadProps.files.length === 0

    return (
        <div className="space-y-2 max-w-sm">
            {label && <p className="text-sm font-medium">{label}</p>}

            {showExisting ? (
                <div className={`relative border ${aspectRatio === 'wide' ? 'aspect-video w-full' : 'aspect-square w-32'
                    }`}>
                    {/* Plain img — avoids next/image private IP issue with Supabase storage */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={value}
                        alt={label ?? 'Image'}
                        className="object-cover w-full h-full"
                    />
                    <button
                        type="button"
                        onClick={async () => {
                            const prevPath = previousPathRef.current
                            if (prevPath) {
                                await supabase.storage.from(bucket).remove([prevPath])
                                previousPathRef.current = ''
                            }
                            onChange('', '')
                        }}
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
