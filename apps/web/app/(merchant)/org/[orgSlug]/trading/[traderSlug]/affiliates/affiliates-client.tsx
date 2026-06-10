'use client'

import { useState, useTransition } from 'react'
import { updateTraderField } from '../actions'
import { SettingRow, SettingSection, SaveButton } from '../settings-primitives'

type Props = {
    app: { slug: string; faq_affiliate_link: string | null; affiliate_link: string | null }
    orgSlug: string
    traderSlug: string
}

export default function AffiliatesClient({ app, orgSlug, traderSlug }: Props) {
    const [faqLink, setFaqLink] = useState(app.faq_affiliate_link ?? '')
    const [heroLink, setHeroLink] = useState(app.affiliate_link ?? '')
    const [error, setError] = useState<string | null>(null)
    const [saved, setSaved] = useState(false)
    const [isPending, start] = useTransition()

    const submit = (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setSaved(false)
        start(async () => {
            const res = await updateTraderField(orgSlug, traderSlug, {
                faq_affiliate_link: faqLink || null,
                affiliate_link: heroLink || null,
            })
            if (res.error) { setError(res.error); return }
            setSaved(true)
        })
    }

    return (
        <form onSubmit={submit} className="max-w-2xl space-y-8">
            <div>
                <h1 className="text-[16px] font-semibold text-[var(--md-sys-color-on-surface)]">Affiliates</h1>
                <p className="text-[12px] text-[var(--md-sys-color-on-surface-variant)] mt-0.5">
                    Links used for trader signup attribution
                </p>
            </div>

            <SettingSection label="Links">
                <SettingRow
                    label="FAQ affiliate link"
                    description="Shown in FAQ pages as the 'Create account' CTA — tracks signup attribution"
                >
                    <input
                        value={faqLink}
                        onChange={e => setFaqLink(e.target.value)}
                        placeholder="https://deriv.com/signup/?affiliate=..."
                        type="url"
                        className="w-full h-10 rounded-xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-variant)]/30 px-4 text-[14px] focus:outline-none focus:border-[var(--md-sys-color-primary)] focus:ring-2 focus:ring-[var(--md-sys-color-primary)]/15 transition-all"
                    />
                </SettingRow>
                <SettingRow
                    label="Affiliate link"
                    description="Shown in the hero and 'Become an affiliate' CTA — separate from FAQ link"
                >
                    <input
                        value={heroLink}
                        onChange={e => setHeroLink(e.target.value)}
                        placeholder="https://deriv.com/partners/affiliate-ib/..."
                        type="url"
                        className="w-full h-10 rounded-xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-variant)]/30 px-4 text-[14px] focus:outline-none focus:border-[var(--md-sys-color-primary)] focus:ring-2 focus:ring-[var(--md-sys-color-primary)]/15 transition-all"
                    />
                </SettingRow>
            </SettingSection>

            {error && <p className="text-[13px] text-[var(--md-sys-color-error)]">{error}</p>}
            <SaveButton isPending={isPending} saved={saved} />
        </form>
    )
}
