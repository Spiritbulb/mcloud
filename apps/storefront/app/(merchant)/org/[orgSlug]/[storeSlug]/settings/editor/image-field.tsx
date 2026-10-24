'use client'

import { Button } from '@mcloud/ui/kit/button'
import { Icon } from '@mcloud/ui/kit/icon'

/** Opens the Editor's one image picker on `current`; `apply` receives the chosen URL ('' removes it). */
export type PickImage = (current: string, apply: (url: string) => void) => void

/** A thumbnail with Change/Remove. The picking itself happens in the shared ImagePicker. */
export default function ImageField({
    value,
    onChange,
    pickImage,
}: {
    value: string
    onChange: (url: string) => void
    pickImage: PickImage
}) {
    if (!value) {
        return (
            <button
                type="button"
                onClick={() => pickImage('', onChange)}
                className="flex h-20 w-full flex-col items-center justify-center gap-1 rounded-md border border-dashed border-input bg-muted/30 text-[12px] text-muted-foreground transition-colors hover:border-ring hover:text-foreground"
            >
                <Icon name="add_photo_alternate" size={20} />
                Add image
            </button>
        )
    }
    return (
        <div className="flex items-center gap-3">
            <button
                type="button"
                onClick={() => pickImage(value, onChange)}
                className="h-14 w-20 shrink-0 overflow-hidden rounded-md border border-border bg-muted"
                aria-label="Change image"
            >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={value} alt="" className="h-full w-full object-cover" />
            </button>
            <div className="flex flex-wrap gap-1.5">
                <Button size="sm" onClick={() => pickImage(value, onChange)}>Change</Button>
                <Button size="sm" variant="ghost" onClick={() => onChange('')}>Remove</Button>
            </div>
        </div>
    )
}
