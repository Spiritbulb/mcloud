'use client'

import { useState } from 'react'
import type { Tables } from '@mcloud/db/types'
import { updateStoreSettings } from '../actions'
import { storefrontUrl, storefrontDisplayUrl } from '@mcloud/merchant/storefront-url'
import { Badge } from '@mcloud/ui/kit/badge'
import { Field, FormGrid, Select, Switch, TextArea, TextInput } from '@mcloud/ui/kit/form'
import { Icon } from '@mcloud/ui/kit/icon'
import { Notice } from '@mcloud/ui/kit/notice'
import { PageHeader } from '@mcloud/ui/kit/page-header'
import { Panel } from '@mcloud/ui/kit/panel'
import { SaveBar, SaveStatus } from '@mcloud/ui/kit/save-bar'
import { isDirty } from '@mcloud/ui/kit/ui-logic'

type Store = Tables<'stores'>

// ─── Constants ────────────────────────────────────────────────────────────────

const CURRENCIES = [
    { value: 'KES', label: 'KES: Kenyan shilling' },
    { value: 'USD', label: 'USD: US dollar' },
    { value: 'EUR', label: 'EUR: Euro' },
    { value: 'GBP', label: 'GBP: British pound' },
    { value: 'UGX', label: 'UGX: Ugandan shilling' },
    { value: 'TZS', label: 'TZS: Tanzanian shilling' },
    { value: 'NGN', label: 'NGN: Nigerian naira' },
    { value: 'GHS', label: 'GHS: Ghanaian cedi' },
    { value: 'ZAR', label: 'ZAR: South African rand' },
]

const TIMEZONES = [
    { value: 'EAT', label: 'Nairobi (EAT, UTC+3)' },
    { value: 'WAT', label: 'Lagos (WAT, UTC+1)' },
    { value: 'GMT', label: 'Accra (GMT, UTC+0)' },
    { value: 'SAST', label: 'Johannesburg (SAST, UTC+2)' },
    { value: 'EET', label: 'Cairo (EET, UTC+2)' },
    { value: 'UTC', label: 'UTC' },
    { value: 'BST', label: 'London (GMT/BST)' },
    { value: 'CET', label: 'Paris (CET, UTC+1)' },
    { value: 'ET', label: 'New York (ET)' },
    { value: 'PT', label: 'Los Angeles (PT)' },
    { value: 'GST', label: 'Dubai (GST, UTC+4)' },
]

// Flag images for the currency select; EUR and GBP are not country codes.
const FLAG_OVERRIDES: Record<string, string> = { EUR: 'eu', GBP: 'gb' }

function fromStore(store: Store) {
    return {
        name: store.name,
        description: store.description ?? '',
        currency: store.currency,
        timezone: store.timezone ?? 'Africa/Nairobi',
        isActive: store.is_active ?? false,
    }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function GeneralSettingsPage({ store }: { store: Store }) {
    // `saved` is the last state the server has; it moves forward on every successful save, so the
    // save bar disappears afterwards instead of comparing against the page's first load forever.
    const [saved, setSaved] = useState(() => fromStore(store))
    const [draft, setDraft] = useState(saved)
    const [saving, setSaving] = useState(false)
    const [justSaved, setJustSaved] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const dirty = isDirty(saved, draft)
    const set = (patch: Partial<typeof draft>) => setDraft((d) => ({ ...d, ...patch }))
    const flag = FLAG_OVERRIDES[draft.currency] ?? draft.currency.slice(0, 2).toLowerCase()

    const handleSave = async () => {
        setSaving(true)
        setError(null)
        try {
            const { error } = await updateStoreSettings(store.slug, {
                name: draft.name,
                description: draft.description || null,
                currency: draft.currency,
                timezone: draft.timezone,
                is_active: draft.isActive,
            })
            if (error) throw new Error(error)
            setSaved(draft)
            setJustSaved(true)
            setTimeout(() => setJustSaved(false), 2500)
        } catch (e) {
            setError(e instanceof Error && e.message ? e.message : 'Something went wrong. Try again.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="space-y-6">
            <PageHeader title="General" description="Your store's name, locale and whether it is open." />

            {error && <Notice tone="error">{error}</Notice>}

            <Panel title="Store identity" description="Basic information shown to your customers.">
                <div className="space-y-4">
                    <FormGrid>
                        <Field label="Site name">
                            <TextInput value={draft.name} placeholder="My Site" onChange={(e) => set({ name: e.target.value })} />
                        </Field>
                        <Field label="Site URL" hint="Set when the store was created.">
                            <TextInput value={storefrontDisplayUrl(store.slug)} disabled readOnly />
                        </Field>
                    </FormGrid>
                    <Field label="Description">
                        <TextArea value={draft.description} rows={3} placeholder="Tell customers what you sell…" onChange={(e) => set({ description: e.target.value })} />
                    </Field>
                </div>
            </Panel>

            <Panel title="Locale" description="Currency and timezone for your storefront and reports.">
                <FormGrid>
                    <Field label="Currency">
                        <div className="relative">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={`https://flagcdn.com/24x18/${flag}.png`} alt="" className="pointer-events-none absolute left-2.5 top-1/2 h-auto w-5 -translate-y-1/2 rounded-[2px]" />
                            <Select value={draft.currency} onChange={(e) => set({ currency: e.target.value })} className="pl-9">
                                {CURRENCIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                            </Select>
                        </div>
                    </Field>
                    <Field label="Timezone">
                        <Select value={draft.timezone} onChange={(e) => set({ timezone: e.target.value })}>
                            {/* Keep a stored value that is not in the list visible, rather than showing the first option. */}
                            {!TIMEZONES.some((tz) => tz.value === draft.timezone) && <option value={draft.timezone}>{draft.timezone}</option>}
                            {TIMEZONES.map((tz) => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
                        </Select>
                    </Field>
                </FormGrid>
            </Panel>

            <Panel title="Visibility" description="Whether your store is open for business.">
                <div className="space-y-3">
                    <Switch label="Site active" description="When off, visitors see a coming soon page." checked={draft.isActive} onChange={(isActive) => set({ isActive })} />
                    <div className="flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
                        {saved.isActive ? (
                            <>
                                <Badge tone="success">Live</Badge>
                                <a href={storefrontUrl(store.slug)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-foreground">
                                    {storefrontDisplayUrl(store.slug)}
                                    <Icon name="open_in_new" size={13} />
                                </a>
                            </>
                        ) : (
                            <>
                                <Badge>Hidden</Badge>
                                <span>Visitors see the coming soon page.</span>
                            </>
                        )}
                    </div>
                </div>
            </Panel>

            <SaveBar dirty={dirty} saving={saving} onSave={handleSave} onDiscard={() => { setDraft(saved); setError(null) }} />
            <SaveStatus saving={false} saved={justSaved && !dirty} />
        </div>
    )
}
