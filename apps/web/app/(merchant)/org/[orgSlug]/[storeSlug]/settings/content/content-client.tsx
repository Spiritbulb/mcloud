'use client'

// The Content editor. Everything a non-commerce site shows visitors: mission,
// programs, impact, contact, campaigns.
//
// All validation and serialization lives in @/lib/content-draft (pure, tested).
// This file is only the form. It never writes to Supabase directly: the save
// goes through updateStoreSettings, the existing session-authorized,
// canManage-gated, service-role server action.

import { useState } from 'react'
import type { Json } from '@mcloud/db/types'
import { SettingsSection, SettingsField, SaveBar, SaveToast } from '../settings-primitives'
import { updateStoreSettings } from '../actions'
import {
    draftFromSettings,
    validateDraft,
    settingsFromDraft,
    newCampaignId,
    type NgoDraft,
} from '@/lib/content-draft'
import CampaignCard from './campaign-card'
import { ProGateInline } from '@/components/pro'
import type { Plan } from '@/lib/plans'

const inputClass =
    'flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-1 text-[14px] shadow-sm transition-colors placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'

const textareaClass =
    'flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-[14px] shadow-sm transition-colors placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'

const ghostButtonClass =
    'inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-[var(--md-sys-color-outline-variant)] text-[13px] font-medium text-[var(--md-sys-color-on-surface)] hover:bg-[var(--md-sys-color-surface-container)] transition-colors'

const removeButtonClass =
    'inline-flex items-center gap-1 text-[12.5px] font-medium text-[var(--md-sys-color-error)] hover:underline underline-offset-4'

export default function ContentClient({
    slug,
    storeId,
    initialSettings,
    plan,
}: {
    slug: string
    storeId: string
    initialSettings: Record<string, unknown>
    plan: Plan
}) {
    const [draft, setDraft] = useState<NgoDraft>(() => draftFromSettings(initialSettings))
    const [errors, setErrors] = useState<string[]>([])
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    const set = <K extends keyof NgoDraft>(key: K, value: NgoDraft[K]) => {
        setDraft((d) => ({ ...d, [key]: value }))
        setSaved(false)
    }

    const handleSave = async () => {
        // Refuse to save an invalid draft. The storefront readers fail silently
        // on a titleless or unfundable campaign, so this is the only place the
        // merchant ever finds out.
        const errs = validateDraft(draft)
        setErrors(errs)
        if (errs.length) return

        setSaving(true)
        // Merge into the previous settings so theme, hero and social keys survive.
        const settings = settingsFromDraft(draft, initialSettings)
        const { error } = await updateStoreSettings(slug, { settings: settings as Json })
        setSaving(false)

        // Keep the draft on failure so nothing the merchant typed is lost.
        if (error) {
            setErrors([error])
            return
        }
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
    }

    return (
        <ProGateInline
            plan={plan}
            requires="hobby"
            feature="Blog & content pages"
            description="Publish blog posts and custom content pages on the Hobby plan and higher."
        >
        <div className="max-w-3xl mx-auto space-y-6 pb-24">
            {/* ── Mission ───────────────────────────────────────────────── */}
            <SettingsSection
                title="Mission"
                description="The first thing visitors read on your site"
            >
                <div className="space-y-5">
                    <SettingsField label="Headline">
                        <input
                            className={inputClass}
                            placeholder="Clean water for every village"
                            value={draft.missionHeadline}
                            onChange={(e) => set('missionHeadline', e.target.value)}
                        />
                    </SettingsField>
                    <SettingsField label="Mission" hint="What your organisation is for, in a sentence or two.">
                        <textarea
                            className={textareaClass}
                            rows={3}
                            placeholder="We dig wells in communities that walk hours for water."
                            value={draft.mission}
                            onChange={(e) => set('mission', e.target.value)}
                        />
                    </SettingsField>
                </div>
            </SettingsSection>

            {/* ── Programs ──────────────────────────────────────────────── */}
            <SettingsSection title="Programs" description="The work you do, shown as cards on your site">
                <div className="space-y-4">
                    {draft.programs.map((p, i) => (
                        <div
                            key={i}
                            className="rounded-lg border border-[var(--md-sys-color-outline-variant)] p-4 space-y-4"
                        >
                            <SettingsField label="Title">
                                <input
                                    className={inputClass}
                                    placeholder="Wells"
                                    value={p.title}
                                    onChange={(e) => {
                                        const next = [...draft.programs]
                                        next[i] = { ...p, title: e.target.value }
                                        set('programs', next)
                                    }}
                                />
                            </SettingsField>
                            <SettingsField label="Description">
                                <textarea
                                    className={textareaClass}
                                    rows={2}
                                    placeholder="What it does"
                                    value={p.description}
                                    onChange={(e) => {
                                        const next = [...draft.programs]
                                        next[i] = { ...p, description: e.target.value }
                                        set('programs', next)
                                    }}
                                />
                            </SettingsField>
                            <button
                                type="button"
                                className={removeButtonClass}
                                onClick={() => set('programs', draft.programs.filter((_, j) => j !== i))}
                            >
                                Remove program
                            </button>
                        </div>
                    ))}
                    <button
                        type="button"
                        className={ghostButtonClass}
                        onClick={() =>
                            set('programs', [...draft.programs, { title: '', description: '', image: '' }])
                        }
                    >
                        <span className="material-symbols-outlined text-[16px]">add</span>
                        Add program
                    </button>
                </div>
            </SettingsSection>

            {/* ── Impact ────────────────────────────────────────────────── */}
            <SettingsSection title="Impact" description="Numbers that show what the work adds up to">
                <div className="space-y-3">
                    {draft.impactStats.map((s, i) => (
                        <div key={i} className="flex items-center gap-3">
                            <input
                                className={inputClass}
                                placeholder="Label (e.g. Wells dug)"
                                value={s.label}
                                onChange={(e) => {
                                    const next = [...draft.impactStats]
                                    next[i] = { ...s, label: e.target.value }
                                    set('impactStats', next)
                                }}
                            />
                            <input
                                className={`${inputClass} max-w-[8rem]`}
                                placeholder="Value"
                                value={s.value}
                                onChange={(e) => {
                                    const next = [...draft.impactStats]
                                    next[i] = { ...s, value: e.target.value }
                                    set('impactStats', next)
                                }}
                            />
                            <button
                                type="button"
                                className={removeButtonClass}
                                onClick={() =>
                                    set('impactStats', draft.impactStats.filter((_, j) => j !== i))
                                }
                            >
                                Remove
                            </button>
                        </div>
                    ))}
                    <button
                        type="button"
                        className={ghostButtonClass}
                        onClick={() => set('impactStats', [...draft.impactStats, { label: '', value: '' }])}
                    >
                        <span className="material-symbols-outlined text-[16px]">add</span>
                        Add stat
                    </button>
                </div>
            </SettingsSection>

            {/* ── Contact ───────────────────────────────────────────────── */}
            <SettingsSection title="Contact" description="How people reach you">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                    <SettingsField label="Address">
                        <input
                            className={inputClass}
                            placeholder="Nairobi, Kenya"
                            value={draft.contact.address}
                            onChange={(e) => set('contact', { ...draft.contact, address: e.target.value })}
                        />
                    </SettingsField>
                    <SettingsField label="Email">
                        <input
                            className={inputClass}
                            placeholder="hello@example.org"
                            value={draft.contact.email}
                            onChange={(e) => set('contact', { ...draft.contact, email: e.target.value })}
                        />
                    </SettingsField>
                    <SettingsField label="Phone">
                        <input
                            className={inputClass}
                            placeholder="+254 700 000 000"
                            value={draft.contact.phone}
                            onChange={(e) => set('contact', { ...draft.contact, phone: e.target.value })}
                        />
                    </SettingsField>
                </div>
            </SettingsSection>

            {/* ── Campaigns ─────────────────────────────────────────────── */}
            <SettingsSection
                title="Campaigns"
                description="What people can donate to. Each campaign tracks its own total raised."
            >
                <div className="space-y-4">
                    {draft.campaigns.map((c, i) => (
                        <CampaignCard
                            key={c.id}
                            storeId={storeId}
                            campaign={c}
                            onChange={(next) => {
                                const cs = [...draft.campaigns]
                                cs[i] = next
                                set('campaigns', cs)
                            }}
                            onRemove={() =>
                                set('campaigns', draft.campaigns.filter((_, j) => j !== i))
                            }
                        />
                    ))}
                    <button
                        type="button"
                        className={ghostButtonClass}
                        onClick={() =>
                            set('campaigns', [
                                ...draft.campaigns,
                                {
                                    // Generated once, never editable. Donations carry this id
                                    // in their metadata, so changing it orphans them.
                                    id: newCampaignId(draft.campaigns.map((c) => c.id)),
                                    title: '',
                                    description: '',
                                    image: '',
                                    goalAmount: '',
                                    presets: '',
                                    allowCustomAmount: true,
                                    minAmount: '',
                                },
                            ])
                        }
                    >
                        <span className="material-symbols-outlined text-[16px]">add</span>
                        Add campaign
                    </button>
                </div>
            </SettingsSection>

            {/* ── Errors ────────────────────────────────────────────────── */}
            {errors.length > 0 && (
                <div className="rounded-xl border border-[var(--md-sys-color-error)] bg-[var(--md-sys-color-error-container)] px-5 py-4">
                    <p className="text-[13px] font-semibold text-[var(--md-sys-color-on-error-container)]">
                        Not saved. Fix these first.
                    </p>
                    <ul className="mt-2 list-disc pl-5 space-y-1 text-[12.5px] text-[var(--md-sys-color-on-error-container)]">
                        {errors.map((e, i) => (
                            <li key={i}>{e}</li>
                        ))}
                    </ul>
                </div>
            )}

            <SaveBar onSave={handleSave} saving={saving} />
            <SaveToast saving={saving} saved={saved} />
        </div>
        </ProGateInline>
    )
}
