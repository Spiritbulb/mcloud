'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@mcloud/ui/kit/button'
import { Icon } from '@mcloud/ui/kit/icon'
import { Field, TextInput } from '@mcloud/ui/kit/form'
import ImageUpload from '@/components/store/image-upload'
import { cn } from '@mcloud/ui/utils'

/**
 * Picks the image for a slot, whether it was clicked in the preview or in the
 * sidebar.
 *
 * Upload and URL are both first-class: a merchant migrating a site already has
 * their images hosted somewhere, and one starting out has them on their phone.
 *
 * This lives in the ADMIN, not the storefront: it needs the merchant's session and
 * the upload credentials, and the public site must never be the thing prompting
 * for or receiving a file.
 */
export default function ImagePicker({
    value, storeId, onPick, onClose,
}: {
    /** The image currently in the slot, if any. */
    value: string
    storeId: string
    onPick: (url: string) => void
    onClose: () => void
}) {
    const ref = useRef<HTMLDialogElement>(null)
    const [url, setUrl] = useState(value)
    const [mode, setMode] = useState<'upload' | 'url'>(value ? 'url' : 'upload')

    // Open while mounted: the Editor mounts one per pick.
    useEffect(() => {
        const d = ref.current
        if (d && !d.open) d.showModal()
    }, [])

    // A URL the browser cannot load as an image is worse than none: it renders a
    // broken icon on the live site. Only http(s) is accepted, so a `javascript:` or
    // `data:` string cannot reach an src attribute.
    const trimmed = url.trim()
    const valid = trimmed === '' || /^https?:\/\/\S+$/i.test(trimmed)

    return (
        <dialog
            ref={ref}
            aria-labelledby="image-picker-title"
            onCancel={(e) => { e.preventDefault(); onClose() }}
            onClick={(e) => { if (e.target === ref.current) onClose() }}
            className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-lg border border-border bg-card p-0 text-foreground shadow-xl backdrop:bg-black/40"
        >
            <header className="flex items-center justify-between border-b border-border px-5 py-3">
                <h2 id="image-picker-title" className="text-[15px] font-semibold">
                    {value ? 'Change image' : 'Add an image'}
                </h2>
                <Button variant="ghost" size="sm" aria-label="Close" onClick={onClose}>
                    <Icon name="close" size={16} />
                </Button>
            </header>

            <div className="space-y-4 p-5">
                <div role="tablist" className="inline-flex rounded-md border border-border bg-muted/40 p-0.5">
                    {(['upload', 'url'] as const).map((m) => (
                        <button
                            key={m}
                            role="tab"
                            type="button"
                            aria-selected={mode === m}
                            onClick={() => setMode(m)}
                            className={cn(
                                'h-7 rounded px-3 text-[12px] font-medium transition-colors',
                                mode === m ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            {m === 'upload' ? 'Upload' : 'From a link'}
                        </button>
                    ))}
                </div>

                {mode === 'upload' ? (
                    <ImageUpload
                        value=""
                        onChange={(uploaded) => { if (uploaded) onPick(uploaded) }}
                        bucket="store-assets"
                        pathPrefix={`${storeId}/editor`}
                        aspectRatio="wide"
                    />
                ) : (
                    <>
                        <Field
                            label="Image URL"
                            error={valid ? undefined : 'Use a full web address starting with http:// or https://'}
                        >
                            <TextInput
                                autoFocus
                                value={url}
                                invalid={!valid}
                                onChange={(e) => setUrl(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter' && valid && trimmed) onPick(trimmed) }}
                                placeholder="https://example.org/photo.jpg"
                                spellCheck={false}
                            />
                        </Field>
                        {trimmed !== '' && valid && (
                            // Show it before committing: a typo'd URL is otherwise only
                            // discovered as a broken image on the live site.
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={trimmed}
                                alt=""
                                className="aspect-video w-full rounded-md border border-border bg-muted object-cover"
                            />
                        )}
                    </>
                )}
            </div>

            <footer className="flex items-center justify-between gap-2 border-t border-border bg-muted/30 px-5 py-3">
                {/* Removing is a real edit, and an empty slot is what the merchant clicks to add one back. */}
                {value ? (
                    <Button variant="danger" onClick={() => onPick('')}>Remove image</Button>
                ) : <span />}
                <div className="flex gap-2">
                    <Button onClick={onClose}>Cancel</Button>
                    {mode === 'url' && (
                        <Button variant="primary" onClick={() => onPick(trimmed)} disabled={!valid || !trimmed}>
                            Use this image
                        </Button>
                    )}
                </div>
            </footer>
        </dialog>
    )
}
