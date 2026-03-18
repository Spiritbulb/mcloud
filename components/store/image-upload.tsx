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
    pathPrefix: string   // e.g. `${store.id}/logo` — no trailing slash
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

    // Normalise pathPrefix — strip any trailing slash so we never produce
    // double-slash paths like "storeId/logo//photo.webp", which Supabase
    // rejects with a 400.
    const normalizedPrefix = pathPrefix.replace(/\/+$/, '')

    const uploadProps = useSupabaseUpload({
        bucketName: bucket,
        // The hook uploads to: `${path}/${file.name}`.
        // Pass the normalised prefix so the final path is clean.
        path: normalizedPrefix,
        allowedMimeTypes: ['image/*'],
        maxFiles: 1,
        maxFileSize: 5 * 1024 * 1024,
        upsert: true,
    })

    // Track the previous isSuccess value so we only fire once per upload
    // session, but correctly reset when the dropzone resets between uploads.
    const prevIsSuccessRef = useRef(false)

    useEffect(() => {
        const justSucceeded = uploadProps.isSuccess && !prevIsSuccessRef.current
        prevIsSuccessRef.current = uploadProps.isSuccess

        if (!justSucceeded || uploadProps.successes.length === 0) return

        // successes[0] is the plain file name (e.g. "photo.webp")
        const fileName = uploadProps.successes[0]
        const fullPath = `${normalizedPrefix}/${fileName}`

        const run = async () => {
            try {
                // Clean up the old file if it was stored at a different path
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
                console.error('ImageUpload post-process error', e)
            }
        }

        run()
    }, [uploadProps.isSuccess, uploadProps.successes])

    const showExisting = !!value && !uploadProps.loading && uploadProps.files.length === 0

    return (
        <div className="space-y-2 max-w-sm">
            {label && <p className="text-sm font-medium">{label}</p>}

            {showExisting ? (
                <div className={`relative border ${aspectRatio === 'wide' ? 'aspect-video w-full' : 'aspect-square w-32'
                    }`}>
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