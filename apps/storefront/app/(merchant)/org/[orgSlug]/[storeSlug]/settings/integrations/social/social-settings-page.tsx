'use client'

import { useState } from 'react'
import type { Tables } from '@mcloud/db/types'
import type { Plan } from '@mcloud/merchant/plans'
import { Field, FormGrid, TextInput } from '@mcloud/ui/kit/form'
import { Notice } from '@mcloud/ui/kit/notice'
import { Panel } from '@mcloud/ui/kit/panel'
import { SaveBar, SaveStatus } from '@mcloud/ui/kit/save-bar'
import { isDirty } from '@mcloud/ui/kit/ui-logic'
import { updateStoreSettings } from '../../actions'
import { ProGateInline } from '@/components/pro'

type Links = { instagram: string; tiktok: string; twitter: string; whatsapp: string }

const FIELDS: { key: keyof Links; label: string; placeholder: string; hint?: string }[] = [
    { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/yourhandle' },
    { key: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@yourhandle' },
    { key: 'twitter', label: 'Twitter / X', placeholder: 'https://x.com/yourhandle' },
    { key: 'whatsapp', label: 'WhatsApp', placeholder: '2547XXXXXXXX', hint: 'Your number with the country code, no + or spaces.' },
]

function settingsOf(store: Tables<'stores'>): Record<string, unknown> {
    return store.settings && typeof store.settings === 'object' && !Array.isArray(store.settings) ? (store.settings as Record<string, unknown>) : {}
}

function linksOf(settings: Record<string, unknown>): Links {
    const l = (settings.socialLinks ?? {}) as Partial<Links>
    return { instagram: l.instagram ?? '', tiktok: l.tiktok ?? '', twitter: l.twitter ?? '', whatsapp: l.whatsapp ?? '' }
}

export default function SocialSettingsPage({ store, plan }: { store: Tables<'stores'>; plan: Plan }) {
    const [saved, setSaved] = useState(() => linksOf(settingsOf(store)))
    const [draft, setDraft] = useState(saved)
    const [saving, setSaving] = useState(false)
    const [justSaved, setJustSaved] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSave = async () => {
        setSaving(true)
        setError(null)
        const trimmed = Object.fromEntries(Object.entries(draft).map(([k, v]) => [k, v.trim()])) as Links
        const { error } = await updateStoreSettings(store.slug, {
            settings: {
                ...settingsOf(store),
                socialLinks: {
                    instagram: trimmed.instagram || undefined,
                    tiktok: trimmed.tiktok || undefined,
                    twitter: trimmed.twitter || undefined,
                    whatsapp: trimmed.whatsapp || undefined,
                },
            },
        })
        setSaving(false)
        if (error) {
            setError(error)
            return
        }
        setSaved(trimmed)
        setDraft(trimmed)
        setJustSaved(true)
        setTimeout(() => setJustSaved(false), 2500)
    }

    return (
        <ProGateInline
            plan={plan}
            requires="hobby"
            feature="Social links"
            description="Link your social accounts from your store on the Hobby plan and higher."
        >
            <div className="space-y-6">
                {error && <Notice tone="error">{error}</Notice>}
                <Panel title="Social links" description="Shown on your storefront so customers can follow you.">
                    <FormGrid>
                        {FIELDS.map((f) => (
                            <Field key={f.key} label={f.label} hint={f.hint}>
                                <TextInput
                                    value={draft[f.key]}
                                    placeholder={f.placeholder}
                                    onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                                    autoCapitalize="none"
                                    spellCheck={false}
                                />
                            </Field>
                        ))}
                    </FormGrid>
                </Panel>
                <SaveBar dirty={isDirty(saved, draft)} saving={saving} onSave={handleSave} onDiscard={() => setDraft(saved)} />
                <SaveStatus saving={saving} saved={justSaved} />
            </div>
        </ProGateInline>
    )
}
