'use client'

import { useState } from 'react'
import { createClient } from '@/lib/client'
import { SettingsSection, SettingsField, SaveBar, SaveToast } from '@/app/store/[slug]/settings/settings-primitives'

export default function SocialSettingsPage({ store }: { store: any }) {
    const links = store.settings?.socialLinks ?? {}
    const [instagram, setInstagram] = useState(links.instagram ?? '')
    const [tiktok, setTiktok] = useState(links.tiktok ?? '')
    const [twitter, setTwitter] = useState(links.twitter ?? '')
    const [whatsapp, setWhatsapp] = useState(links.whatsapp ?? '')
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    const handleSave = async () => {
        setSaving(true)
        const supabase = createClient()
        await supabase.from('stores').update({
            settings: {
                ...store.settings,
                socialLinks: {
                    instagram: instagram || undefined,
                    tiktok: tiktok || undefined,
                    twitter: twitter || undefined,
                    whatsapp: whatsapp || undefined,
                },
            },
        }).eq('id', store.id)
        setSaving(false)
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
    }

    const fields = [
        { label: 'Instagram', placeholder: 'https://instagram.com/yourhandle', value: instagram, set: setInstagram },
        { label: 'TikTok', placeholder: 'https://tiktok.com/@yourhandle', value: tiktok, set: setTiktok },
        { label: 'Twitter / X', placeholder: 'https://x.com/yourhandle', value: twitter, set: setTwitter },
        { label: 'WhatsApp', placeholder: '2547XXXXXXXX', value: whatsapp, set: setWhatsapp },
    ]

    return (
        <>
            <SettingsSection title="Social links" description="Show up where your audience already is">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                    {fields.map((f) => (
                        <SettingsField key={f.label} label={f.label}>
                            <input value={f.value} onChange={(e) => f.set(e.target.value)} placeholder={f.placeholder} className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-1 text-[14px] shadow-sm transition-colors placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50" />
                        </SettingsField>
                    ))}
                </div>
            </SettingsSection>
            <SaveBar onSave={handleSave} saving={saving} />
            <SaveToast saving={saving} saved={saved} />
        </>
    )
}