'use client'

import { useState, useTransition } from 'react'
import { updateTraderField } from '../actions'
import { SettingRow, SettingSection, SaveButton } from '../settings-primitives'

type Props = {
    app: { slug: string; support_email: string | null; support_whatsapp: string | null }
    orgSlug: string
    traderSlug: string
}

export default function SupportClient({ app, orgSlug, traderSlug }: Props) {
    const [email, setEmail] = useState(app.support_email ?? '')
    const [whatsapp, setWhatsapp] = useState(app.support_whatsapp ?? '')
    const [error, setError] = useState<string | null>(null)
    const [saved, setSaved] = useState(false)
    const [isPending, start] = useTransition()

    const submit = (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setSaved(false)
        start(async () => {
            const res = await updateTraderField(orgSlug, traderSlug, {
                support_email: email || null,
                support_whatsapp: whatsapp || null,
            })
            if (res.error) { setError(res.error); return }
            setSaved(true)
        })
    }

    return (
        <form onSubmit={submit} className="max-w-2xl space-y-8">
            <div>
                <h1 className="text-[16px] font-semibold text-[var(--md-sys-color-on-surface)]">Support</h1>
                <p className="text-[12px] text-[var(--md-sys-color-on-surface-variant)] mt-0.5">
                    Contact details shown to traders in the app
                </p>
            </div>

            <SettingSection label="Contacts">
                <SettingRow label="Support email" description="Shown in the app's support / help pages">
                    <input
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="support@yourbrand.com"
                        type="email"
                        className="w-full h-10 rounded-xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-variant)]/30 px-4 text-[14px] focus:outline-none focus:border-[var(--md-sys-color-primary)] focus:ring-2 focus:ring-[var(--md-sys-color-primary)]/15 transition-all"
                    />
                </SettingRow>
                <SettingRow label="WhatsApp" description="Full wa.me URL — e.g. https://wa.me/447426734754">
                    <input
                        value={whatsapp}
                        onChange={e => setWhatsapp(e.target.value)}
                        placeholder="https://wa.me/447426734754"
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
