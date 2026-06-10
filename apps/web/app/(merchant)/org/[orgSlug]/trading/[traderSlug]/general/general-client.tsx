'use client'

import { useState, useTransition } from 'react'
import { updateTraderField } from '../actions'
import { SettingRow, SettingSection, SaveButton } from '../settings-primitives'

type Props = {
    app: { id: string; slug: string; brand_name: string; is_active: boolean }
    orgSlug: string
    traderSlug: string
}

export default function GeneralClient({ app, orgSlug, traderSlug }: Props) {
    const [brandName, setBrandName] = useState(app.brand_name)
    const [isActive, setIsActive] = useState(app.is_active)
    const [error, setError] = useState<string | null>(null)
    const [saved, setSaved] = useState(false)
    const [isPending, start] = useTransition()

    const submit = (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setSaved(false)
        start(async () => {
            const res = await updateTraderField(orgSlug, traderSlug, { brand_name: brandName, is_active: isActive })
            if (res.error) { setError(res.error); return }
            setSaved(true)
        })
    }

    return (
        <form onSubmit={submit} className="max-w-2xl space-y-8">
            <div>
                <h1 className="text-[16px] font-semibold text-[var(--md-sys-color-on-surface)]">General</h1>
                <p className="text-[12px] text-[var(--md-sys-color-on-surface-variant)] mt-0.5">Basic information about this trading app</p>
            </div>

            <SettingSection label="Identity">
                <SettingRow label="Brand name" description="The public-facing name shown to traders">
                    <input
                        value={brandName}
                        onChange={e => setBrandName(e.target.value)}
                        required
                        className="w-full h-10 rounded-xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-variant)]/30 px-4 text-[14px] focus:outline-none focus:border-[var(--md-sys-color-primary)] focus:ring-2 focus:ring-[var(--md-sys-color-primary)]/15 transition-all"
                    />
                </SettingRow>
                <SettingRow label="Slug" description="URL-safe identifier — cannot be changed after creation">
                    <input
                        value={app.slug}
                        readOnly
                        className="w-full h-10 rounded-xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-variant)]/10 px-4 text-[14px] text-[var(--md-sys-color-on-surface-variant)] cursor-not-allowed"
                    />
                </SettingRow>
            </SettingSection>

            <SettingSection label="Status">
                <SettingRow label="Active" description="Inactive apps will not respond to tenant lookups">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <div
                            onClick={() => setIsActive(v => !v)}
                            className={`relative w-11 h-6 rounded-full transition-colors ${isActive ? 'bg-[var(--md-sys-color-primary)]' : 'bg-[var(--md-sys-color-surface-variant)]'}`}
                        >
                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                        </div>
                        <span className="text-[13px] text-[var(--md-sys-color-on-surface-variant)]">{isActive ? 'Active' : 'Inactive'}</span>
                    </label>
                </SettingRow>
            </SettingSection>

            {error && <p className="text-[13px] text-[var(--md-sys-color-error)]">{error}</p>}
            <SaveButton isPending={isPending} saved={saved} />
        </form>
    )
}
