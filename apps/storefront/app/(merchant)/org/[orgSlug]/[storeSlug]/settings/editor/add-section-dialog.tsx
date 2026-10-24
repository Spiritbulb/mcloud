'use client'

import { useEffect, useRef } from 'react'
import { Button } from '@mcloud/ui/kit/button'
import { Icon } from '@mcloud/ui/kit/icon'

export type SectionChoice = { type: string; label: string; description?: string }

/** Picks the kind of section to insert. Opened from the sidebar or from ＋ in the preview. */
export default function AddSectionDialog({
    open, choices, onPick, onClose,
}: {
    open: boolean
    choices: SectionChoice[]
    onPick: (type: string) => void
    onClose: () => void
}) {
    const ref = useRef<HTMLDialogElement>(null)
    useEffect(() => {
        const d = ref.current
        if (!d) return
        if (open && !d.open) d.showModal()
        if (!open && d.open) d.close()
    }, [open])

    return (
        <dialog
            ref={ref}
            aria-labelledby="add-section-title"
            onCancel={(e) => { e.preventDefault(); onClose() }}
            onClick={(e) => { if (e.target === ref.current) onClose() }}
            className="m-auto w-[min(30rem,calc(100vw-2rem))] rounded-lg border border-border bg-card p-0 text-foreground shadow-xl backdrop:bg-black/40"
        >
            <header className="flex items-center justify-between border-b border-border px-5 py-3">
                <h2 id="add-section-title" className="text-[15px] font-semibold">Add a section</h2>
                <Button variant="ghost" size="sm" aria-label="Close" onClick={onClose}>
                    <Icon name="close" size={16} />
                </Button>
            </header>
            <ul className="max-h-[60vh] overflow-y-auto p-2">
                {choices.map((c) => (
                    <li key={c.type}>
                        <button
                            type="button"
                            onClick={() => onPick(c.type)}
                            className="flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none"
                        >
                            <Icon name={SECTION_ICONS[c.type] ?? 'view_agenda'} size={18} className="mt-0.5 text-muted-foreground" />
                            <span className="min-w-0">
                                <span className="block text-[13px] font-medium">{c.label}</span>
                                {c.description && <span className="block text-[12px] text-muted-foreground">{c.description}</span>}
                            </span>
                        </button>
                    </li>
                ))}
            </ul>
        </dialog>
    )
}

/** Material Symbols name per section type, shared with the section list. */
export const SECTION_ICONS: Record<string, string> = {
    hero: 'view_carousel',
    collections: 'category',
    featured: 'star',
    'all-products': 'grid_view',
    mission: 'flag',
    programs: 'volunteer_activism',
    impact: 'monitoring',
    contact: 'contact_mail',
    campaigns: 'campaign',
    gallery: 'photo_library',
    services: 'design_services',
}
