'use client'

import { useState, useTransition } from 'react'
import { updateTraderField } from '../actions'
import { SettingRow, SettingSection, SaveButton } from '../settings-primitives'

type Props = {
    app: { slug: string; logo_url: string | null; primary_color: string | null }
    orgSlug: string
    traderSlug: string
}

export default function BrandingClient({ app, orgSlug, traderSlug }: Props) {
    const [logoUrl, setLogoUrl] = useState(app.logo_url ?? '')
    const [primaryColor, setPrimaryColor] = useState(app.primary_color ?? '#0051ff')
    const [error, setError] = useState<string | null>(null)
    const [saved, setSaved] = useState(false)
    const [isPending, start] = useTransition()

    const submit = (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setSaved(false)
        start(async () => {
            const res = await updateTraderField(orgSlug, traderSlug, {
                logo_url: logoUrl || null,
                primary_color: primaryColor,
            })
            if (res.error) { setError(res.error); return }
            setSaved(true)
        })
    }

    return (
        <form onSubmit={submit} className="max-w-2xl space-y-8">
            <div>
                <h1 className="text-[16px] font-semibold text-[var(--md-sys-color-on-surface)]">Branding</h1>
                <p className="text-[12px] text-[var(--md-sys-color-on-surface-variant)] mt-0.5">Visual identity of the trading app</p>
            </div>

            <SettingSection label="Visual">
                <SettingRow label="Logo URL" description="Direct link to the brand logo (PNG or SVG recommended)">
                    <input
                        value={logoUrl}
                        onChange={e => setLogoUrl(e.target.value)}
                        placeholder="https://yourdomain.com/logo.png"
                        type="url"
                        className="w-full h-10 rounded-xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-variant)]/30 px-4 text-[14px] focus:outline-none focus:border-[var(--md-sys-color-primary)] focus:ring-2 focus:ring-[var(--md-sys-color-primary)]/15 transition-all"
                    />
                    {logoUrl && (
                        <div className="mt-2 w-10 h-10 rounded-lg border border-[var(--md-sys-color-outline-variant)] overflow-hidden">
                            <img src={logoUrl} alt="Logo preview" className="w-full h-full object-contain" />
                        </div>
                    )}
                </SettingRow>
                <SettingRow label="Primary colour" description="Main brand colour used in the shell UI">
                    <div className="flex items-center gap-3">
                        <input
                            type="color"
                            value={primaryColor}
                            onChange={e => setPrimaryColor(e.target.value)}
                            className="w-10 h-10 rounded-lg border border-[var(--md-sys-color-outline-variant)] cursor-pointer p-0.5"
                        />
                        <input
                            value={primaryColor}
                            onChange={e => setPrimaryColor(e.target.value)}
                            placeholder="#0051ff"
                            className="flex-1 h-10 rounded-xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-variant)]/30 px-4 text-[14px] font-mono focus:outline-none focus:border-[var(--md-sys-color-primary)] focus:ring-2 focus:ring-[var(--md-sys-color-primary)]/15 transition-all"
                        />
                    </div>
                </SettingRow>
            </SettingSection>

            {error && <p className="text-[13px] text-[var(--md-sys-color-error)]">{error}</p>}
            <SaveButton isPending={isPending} saved={saved} />
        </form>
    )
}
