'use client'

import { useEffect, useRef } from 'react'
import { Dropzone, DropzoneContent, DropzoneEmptyState } from '@/components/dropzone'
import { useR2Upload } from '@/hooks/use-r2-upload'
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
    const previousPathRef = useRef(pathInDb ?? '')

    // Normalise pathPrefix — strip any trailing slash so we never produce
    // double-slash paths like "storeId/logo//photo.webp".
    const normalizedPrefix = pathPrefix.replace(/\/+$/, '')

    const uploadProps = useR2Upload({
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

        // FIX: use the real public R2 URL the worker returned on upload,
        // instead of asking Supabase to build one (which pointed at a bucket
        // the file was never actually in).
        const publicUrl = uploadProps.uploadedUrls[fileName]

        if (publicUrl) {
            previousPathRef.current = fullPath
            onChange(publicUrl, fullPath)
        } else {
            // Upload "succeeded" per the hook's bookkeeping but no URL came back —
            // surface this loudly rather than silently keeping a stale/blank value.
            console.error('ImageUpload: upload succeeded but no public URL was returned', { fileName, fullPath })
        }
    }, [uploadProps.isSuccess, uploadProps.successes, uploadProps.uploadedUrls])

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
                        onClick={() => {
                            // NOTE: this only clears the reference in the UI/DB — the R2 worker
                            // doesn't currently expose a delete route, so the old file stays in
                            // the bucket. Not a functional bug (nothing points at it anymore),
                            // just means R2 storage isn't reclaimed on replace/remove yet.
                            // Add a DELETE handler to the worker + call it here if that matters
                            // for your storage costs later.
                            previousPathRef.current = ''
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