'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import ImageUpload from '@/components/store/image-upload'

/**
 * Picks the image for a slot clicked in the preview.
 *
 * URL is the primary input, because that is how a merchant migrating a site
 * actually has their images: already hosted somewhere. Uploading is the secondary
 * path, for the ones they only have on their phone.
 *
 * This lives in the ADMIN, not the storefront: it needs the merchant's session and
 * the upload credentials, and the public site must never be the thing prompting for
 * or receiving a file.
 */
export default function ImagePicker({
    open, value, storeId, pathPrefix, onPick, onClose,
}: {
    open: boolean
    /** The image currently in the slot, if any. */
    value: string
    storeId: string
    /** Where an uploaded file lands in the bucket. */
    pathPrefix: string
    onPick: (url: string) => void
    onClose: () => void
}) {
    const [url, setUrl] = useState(value)
    const [mode, setMode] = useState<'url' | 'upload'>('url')

    // Reopening on a different slot must show THAT slot's image, not the last one.
    useEffect(() => {
        if (open) {
            setUrl(value)
            setMode('url')
        }
    }, [open, value])

    if (!open) return null

    // A URL the browser cannot load as an image is worse than none: it renders a
    // broken icon on the live site. Only http(s) is accepted, so a `javascript:` or
    // `data:` string cannot reach an src attribute.
    const trimmed = url.trim()
    const valid = trimmed === '' || /^https?:\/\/\S+$/i.test(trimmed)

    return (
        <div
            className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 p-6"
            onClick={onClose}
        >
            <div
                className="w-full max-w-md rounded-2xl bg-[var(--md-sys-color-surface)] shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="flex items-center justify-between px-5 h-14 border-b border-[var(--md-sys-color-outline-variant)]">
                    <h2 className="text-[14px] font-semibold text-[var(--md-sys-color-on-surface)]">
                        {value ? 'Change image' : 'Add an image'}
                    </h2>
                    <button
                        onClick={onClose}
                        aria-label="Close"
                        className="w-8 h-8 grid place-items-center rounded-full text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-container)]"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </header>

                <div className="p-5 space-y-4">
                    {mode === 'url' ? (
                        <>
                            <label className="block">
                                <span className="block text-[12px] font-medium text-[var(--md-sys-color-on-surface)] mb-1.5">
                                    Image URL
                                </span>
                                <input
                                    autoFocus
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && valid) onPick(trimmed)
                                        if (e.key === 'Escape') onClose()
                                    }}
                                    placeholder="https://example.org/photo.jpg"
                                    spellCheck={false}
                                    className="w-full h-9 rounded-lg border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface)] px-3 text-[13px] text-[var(--md-sys-color-on-surface)] focus:outline-none focus:border-[var(--md-sys-color-primary)]"
                                />
                            </label>

                            {!valid && (
                                <p className="text-[12px] text-[var(--md-sys-color-error)]">
                                    That needs to be a full web address starting with http:// or https://
                                </p>
                            )}

                            {trimmed !== '' && valid && (
                                // Show it before committing: a typo'd URL is otherwise only
                                // discovered as a broken image on the live site.
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={trimmed}
                                    alt=""
                                    className="w-full rounded-lg border border-[var(--md-sys-color-outline-variant)] object-cover"
                                    style={{ aspectRatio: '16/9' }}
                                />
                            )}

                            <button
                                onClick={() => setMode('upload')}
                                className="text-[12px] underline underline-offset-4 text-[var(--md-sys-color-on-surface-variant)]"
                            >
                                Or upload a file
                            </button>
                        </>
                    ) : (
                        <>
                            <ImageUpload
                                value={trimmed}
                                onChange={(uploaded) => {
                                    setUrl(uploaded)
                                    onPick(uploaded)
                                }}
                                bucket="store-assets"
                                pathPrefix={pathPrefix}
                                aspectRatio="wide"
                            />
                            <button
                                onClick={() => setMode('url')}
                                className="text-[12px] underline underline-offset-4 text-[var(--md-sys-color-on-surface-variant)]"
                            >
                                Or paste a URL
                            </button>
                        </>
                    )}
                </div>

                <footer className="flex items-center justify-between gap-2 px-5 py-4 border-t border-[var(--md-sys-color-outline-variant)]">
                    {/* Removing an image is a real edit, and there is no other way to do
                        it: an empty slot is what the merchant clicks to add one back. */}
                    {value ? (
                        <button
                            onClick={() => onPick('')}
                            className="text-[12px] text-[var(--md-sys-color-error)]"
                        >
                            Remove image
                        </button>
                    ) : <span />}

                    {mode === 'url' && (
                        <button
                            onClick={() => onPick(trimmed)}
                            disabled={!valid}
                            className="h-9 rounded-full bg-[var(--md-sys-color-primary)] px-5 text-[13px] font-semibold text-[var(--md-sys-color-on-primary)] disabled:opacity-50"
                        >
                            Use this image
                        </button>
                    )}
                </footer>
            </div>
        </div>
    )
}
