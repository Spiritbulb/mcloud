'use client'

import { useEffect, useRef } from 'react'
import { Dropzone, DropzoneContent, DropzoneEmptyState } from '@/components/dropzone'
import { useUpload } from '@/hooks/use-upload'
import { isRetiredImageUrl, RetiredImageNotice } from './retired-image'
import { X } from 'lucide-react'

interface ImageUploadProps {
    value: string
    pathInDb?: string
    onChange: (url: string, path: string) => void
    bucket?: 'store-assets' | 'product-images'
    pathPrefix: string   // e.g. `${store.id}/logo` — no trailing slash
    label?: string
    /** Preview shape. `free` shows the image at its own shape (logos). */
    aspectRatio?: 'square' | 'wide' | 'free'
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

    const uploadProps = useUpload({
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
        // The stored key minus its bucket (`<storeId>/logo/<tag>-photo.webp`), like paths saved before.
        const storedKey = uploadProps.uploadedKeys[fileName]
        const fullPath = storedKey ? storedKey.split('/').slice(1).join('/') : `${normalizedPrefix}/${fileName}`

        // The public URL /api/upload returned for the stored object.
        const publicUrl = uploadProps.uploadedUrls[fileName]

        if (publicUrl) {
            previousPathRef.current = fullPath
            onChange(publicUrl, fullPath)
        } else {
            // Upload "succeeded" per the hook's bookkeeping but no URL came back —
            // surface this loudly rather than silently keeping a stale/blank value.
            console.error('ImageUpload: upload succeeded but no public URL was returned', { fileName, fullPath })
        }
    }, [uploadProps.isSuccess, uploadProps.successes, uploadProps.uploadedUrls, uploadProps.uploadedKeys])

    // An image on the retired R2 storage can't be shown: offer the upload box with a notice instead.
    const retired = isRetiredImageUrl(value)
    const showExisting = !!value && !retired && !uploadProps.loading && uploadProps.files.length === 0

    return (
        <div className="space-y-2 max-w-sm">
            {label && <p className="text-sm font-medium">{label}</p>}
            {retired && uploadProps.files.length === 0 && <RetiredImageNotice />}

            {showExisting ? (
                <div className={`relative border ${aspectRatio === 'wide' ? 'aspect-video w-full' : aspectRatio === 'free' ? 'h-24 w-full' : 'aspect-square w-32'
                    }`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={value}
                        alt={label ?? 'Image'}
                        className={`w-full h-full ${aspectRatio === 'free' ? 'object-contain p-2' : 'object-cover'}`}
                    />
                    <button
                        type="button"
                        onClick={() => {
                            // Clears the reference only; the object stays in the bucket (no delete route).
                            previousPathRef.current = ''
                            onChange('', '')
                        }}
                        className="absolute top-1 right-1 bg-background border p-0.5 hover:bg-destructive hover:text-white transition-colors z-10"
                    >
                        <X className="w-3 h-3" />
                    </button>
                </div>
            ) : (
                <div className={aspectRatio === 'wide' ? 'aspect-video w-full' : aspectRatio === 'free' ? 'min-h-32 w-full' : 'aspect-square w-48'}>
                    <Dropzone {...uploadProps}>
                        <DropzoneEmptyState />
                        <DropzoneContent />
                    </Dropzone>
                </div>
            )}
        </div>
    )
}