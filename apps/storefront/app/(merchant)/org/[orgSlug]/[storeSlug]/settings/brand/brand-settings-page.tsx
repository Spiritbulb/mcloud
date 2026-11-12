'use client'

import { useState } from 'react'
import Link from 'next/link'
import { updateStoreSettings, patchStoreSettings } from '../actions'
import { settingsPath } from '../settings-nav-logic'
import ImageUpload from '@/components/store/image-upload'
import { buttonClass } from '@mcloud/ui/kit/button'
import { Field, Select } from '@mcloud/ui/kit/form'
import { Icon } from '@mcloud/ui/kit/icon'
import { Notice } from '@mcloud/ui/kit/notice'
import { PageHeader } from '@mcloud/ui/kit/page-header'
import { Panel } from '@mcloud/ui/kit/panel'
import { SaveBar, SaveStatus } from '@mcloud/ui/kit/save-bar'
import { brandPatch, isBrandDirty, themeSummary, type BrandDraft } from './brand-logic'
import { LOGO_SIZES, COLOR_MODES, logoStyle, type ColorMode, type LogoSize } from '@/lib/brand'

const SIZE_LABELS: Record<LogoSize, string> = { sm: 'Small', md: 'Medium', lg: 'Large' }
const MODE_LABELS: Record<ColorMode, string> = {
    auto: 'Follow the visitor\'s device (default)',
    light: 'Always light',
    dark: 'Always dark',
}

/* eslint-disable @next/next/no-img-element -- merchant uploads on R2; next/image would need the host allow-listed */

function Initials({ name }: { name: string }) {
    return <span className="text-[13px] font-bold uppercase tracking-widest text-muted-foreground">{name.slice(0, 2)}</span>
}

export default function BrandSettingsPage({
    orgSlug, slug, storeId, name, initial, theme,
}: {
    orgSlug: string
    slug: string
    storeId: string
    name: string
    initial: BrandDraft
    theme: Record<string, unknown> | null
}) {
    const [saved, setSaved] = useState(initial)
    const [draft, setDraft] = useState(initial)
    const [saving, setSaving] = useState(false)
    const [justSaved, setJustSaved] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const dirty = isBrandDirty(draft, saved)
    const summary = themeSummary(theme)
    const iconSrc = draft.iconUrl || draft.logoUrl

    const handleSave = async () => {
        setSaving(true)
        setError(null)
        const { columns, settings } = brandPatch(draft)
        // Columns first, then a key-level merge into settings: nothing the Editor saved is overwritten.
        const a = await updateStoreSettings(slug, columns)
        const b = a.error ? a : await patchStoreSettings(slug, settings)
        setSaving(false)
        if (b.error) { setError(b.error); return }
        setSaved(draft)
        setJustSaved(true)
        setTimeout(() => setJustSaved(false), 2500)
    }

    return (
        <div className="space-y-6">
            <PageHeader title="Brand" description="Your logo, icon and light or dark look. Colours and fonts live in the Editor, next to a live preview." />

            {error && <Notice tone="error">{error}</Notice>}

            <Panel title="Logo" description="Shown in your site's header. Any shape works, including wide wordmarks. A PNG or SVG with a transparent background looks best.">
                <div className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-4">
                        <ImageUpload
                            label="Upload logo"
                            value={draft.logoUrl}
                            pathInDb={draft.logoPath}
                            onChange={(url, path) => setDraft((d) => ({ ...d, logoUrl: url, logoPath: path }))}
                            bucket="store-assets"
                            pathPrefix={`${storeId}/logo`}
                            aspectRatio="free"
                        />
                        <Field label="Size in the header" hint="Taller logos get more room; the width follows your logo's shape.">
                            <Select value={draft.logoSize} onChange={(e) => setDraft((d) => ({ ...d, logoSize: e.target.value as LogoSize }))}>
                                {LOGO_SIZES.map((sz) => <option key={sz} value={sz}>{SIZE_LABELS[sz]}</option>)}
                            </Select>
                        </Field>
                        <div className="space-y-2">
                            <ImageUpload
                                label="Logo for dark backgrounds (optional)"
                                value={draft.logoDarkUrl}
                                pathInDb={draft.logoDarkPath}
                                onChange={(url, path) => setDraft((d) => ({ ...d, logoDarkUrl: url, logoDarkPath: path }))}
                                bucket="store-assets"
                                pathPrefix={`${storeId}/logo-dark`}
                                aspectRatio="free"
                            />
                            <p className="text-[12px] text-muted-foreground">Shown in dark mode, for example a white version of your logo.</p>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <p className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Preview</p>
                        {[
                            { label: 'Light', bg: '#ffffff', fg: '#111111', src: draft.logoUrl },
                            { label: 'Dark', bg: '#111111', fg: '#ffffff', src: draft.logoDarkUrl || draft.logoUrl },
                        ].map((s) => (
                            <div key={s.label} className="flex h-14 items-center overflow-hidden rounded-md border border-border px-4" style={{ background: s.bg, color: s.fg }}>
                                {s.src
                                    ? <img src={s.src} alt="" className="w-auto object-contain object-left" style={logoStyle(draft.logoSize)} />
                                    : <span className="text-[14px] font-semibold">{name}</span>}
                            </div>
                        ))}
                        {!draft.logoUrl && <p className="text-[12px] text-muted-foreground">No logo yet, so visitors see your site name.</p>}
                        {draft.logoUrl && !draft.logoDarkUrl && (
                            <p className="text-[12px] text-muted-foreground">In dark mode the same logo is used. If it&apos;s dark, add a light version so it stays visible.</p>
                        )}
                    </div>
                </div>
            </Panel>

            <Panel title="Icon" description="Square, at least 512×512. Used for the browser tab, the home-screen icon and your dashboard. Leave empty to use your logo.">
                <div className="grid gap-5 md:grid-cols-2">
                    <ImageUpload
                        label="Upload icon"
                        value={draft.iconUrl}
                        pathInDb={draft.iconPath}
                        onChange={(url, path) => setDraft((d) => ({ ...d, iconUrl: url, iconPath: path }))}
                        bucket="store-assets"
                        pathPrefix={`${storeId}/icon`}
                        aspectRatio="square"
                    />
                    <div className="space-y-2">
                        <p className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Preview</p>
                        <div className="flex items-center gap-2 rounded-t-md border border-border bg-muted px-3 py-2">
                            <span className="flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden">
                                {iconSrc ? <img src={iconSrc} alt="" className="h-4 w-4 object-contain" /> : <Icon name="language" size={14} />}
                            </span>
                            <span className="truncate text-[12px]">{name}</span>
                        </div>
                        {!draft.iconUrl && draft.logoUrl && (
                            <p className="text-[12px] text-muted-foreground">No icon yet, so your logo is squeezed into the tab. Wide logos get tiny: add a square icon.</p>
                        )}
                        <div className="flex items-center gap-3">
                            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border border-border bg-background">
                                {iconSrc ? <img src={iconSrc} alt="" className="h-full w-full object-contain" /> : <Initials name={name} />}
                            </div>
                            <p className="text-[12px] text-muted-foreground">Home-screen icon</p>
                        </div>
                    </div>
                </div>
            </Panel>

            <Panel title="Light and dark" description="Whether visitors see your light colours, your dark colours, or whichever their device is set to.">
                <Field label="Colour mode" hint="Set the colours for each in the Editor, under Colours and Dark mode colours.">
                    <Select value={draft.colorMode} onChange={(e) => setDraft((d) => ({ ...d, colorMode: e.target.value as ColorMode }))}>
                        {COLOR_MODES.map((m) => <option key={m} value={m}>{MODE_LABELS[m]}</option>)}
                    </Select>
                </Field>
            </Panel>

            <Panel
                title="Colours and fonts"
                description="Set in the Editor, so you see changes on your real pages as you make them."
                action={
                    <Link href={settingsPath(orgSlug, slug, 'editor')} className={buttonClass('secondary', 'sm')}>
                        <Icon name="edit_note" size={15} />
                        Change in Editor
                    </Link>
                }
            >
                <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
                    <div className="flex gap-3">
                        {summary.swatches.map((c) => (
                            <div key={c.label} className="text-center">
                                <span className="block h-9 w-9 rounded-full border border-border" style={{ background: c.color }} />
                                <span className="mt-1 block text-[11px] text-muted-foreground">{c.label}</span>
                            </div>
                        ))}
                    </div>
                    <div className="text-[13px] text-muted-foreground">
                        <p><span className="text-foreground">{summary.headingFont}</span> headings</p>
                        <p><span className="text-foreground">{summary.bodyFont}</span> body text</p>
                    </div>
                </div>
            </Panel>

            <SaveBar dirty={dirty} saving={saving} onSave={handleSave} onDiscard={() => { setDraft(saved); setError(null) }} />
            <SaveStatus saving={false} saved={justSaved && !dirty} />
        </div>
    )
}
