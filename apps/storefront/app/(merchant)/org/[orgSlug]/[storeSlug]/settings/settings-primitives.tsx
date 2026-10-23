'use client'

// The settings screens' building blocks, now thin wrappers over the shared UI kit
// (@mcloud/ui/kit) so every store settings page matches the admin and the org hub.
// The exports and props are unchanged; new code can use the kit directly.

import { FeatureGate } from '@mcloud/ui/kit/feature-gate'
import { Panel } from '@mcloud/ui/kit/panel'
import { SaveBar as KitSaveBar, SaveStatus } from '@mcloud/ui/kit/save-bar'

// ─── SettingsSection ──────────────────────────────────────────────────────────

export function SettingsSection({
    title,
    description,
    aside,
    children,
    noPadding,
}: {
    title?: string
    description?: string
    aside?: React.ReactNode
    children: React.ReactNode
    noPadding?: boolean
}) {
    return (
        <Panel title={title} description={description} action={aside} flush={noPadding}>
            {children}
        </Panel>
    )
}

// ─── SettingsField ────────────────────────────────────────────────────────────

export function SettingsField({
    label,
    hint,
    children,
}: {
    label: string
    hint?: string
    children: React.ReactNode
}) {
    return (
        <div className="min-w-0">
            <label className="mb-1.5 block text-[12px] font-medium text-foreground">{label}</label>
            {children}
            {hint && <p className="mt-1.5 text-[12px] text-muted-foreground">{hint}</p>}
        </div>
    )
}

// ─── SaveBar ──────────────────────────────────────────────────────────────────

/**
 * Always shown: these callers do not track whether the form changed, so it cannot claim there are
 * unsaved changes. New forms should use the kit's SaveBar with `dirty` (see isDirty).
 */
export function SaveBar({ onSave, saving }: { onSave: () => void; saving: boolean }) {
    return <KitSaveBar saving={saving} onSave={onSave} message="" />
}

// ─── SaveToast ────────────────────────────────────────────────────────────────

export function SaveToast({ saving, saved }: { saving: boolean; saved: boolean }) {
    return <SaveStatus saving={saving} saved={saved} />
}

// ─── ProGate ──────────────────────────────────────────────────────────────────

export function ProGate({ feature }: { feature: string }) {
    return (
        <FeatureGate
            icon="schedule"
            title={`${feature} is on its way`}
            description="This feature isn't available yet. Check back soon."
        />
    )
}
