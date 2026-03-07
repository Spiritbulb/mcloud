'use client'

import { cn } from '@/lib/utils'
import { SettingsSection, SettingsField } from './store-settings'

const CURRENCIES = ['KES', 'USD', 'EUR', 'GBP', 'UGX', 'TZS']
const TIMEZONES = [
    'Africa/Nairobi',
    'Africa/Lagos',
    'Africa/Johannesburg',
    'Africa/Cairo',
    'UTC',
    'Europe/London',
    'America/New_York',
]

interface GeneralSettingsProps {
    store: any
    activeTab: string
    setActiveTab: (tab: string) => void
    TABS: any[]
    name: string; setName: (v: string) => void
    description: string; setDescription: (v: string) => void
    currency: string; setCurrency: (v: string) => void
    timezone: string; setTimezone: (v: string) => void
    isActive: boolean; setIsActive: (v: boolean) => void
    logoUrl: string; setLogoUrl: (v: string) => void
}

export default function GeneralSettings({
    store,
    name, setName,
    description, setDescription,
    currency, setCurrency,
    timezone, setTimezone,
    isActive, setIsActive,
}: GeneralSettingsProps) {
    return (
        <div className="space-y-4">

            {/* ── Store identity ── */}
            <SettingsSection
                title="Store identity"
                description="Basic information shown to your customers"
            >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                    <SettingsField label="Store name">
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="My Store"
                            className="settings-input"
                        />
                    </SettingsField>

                    <SettingsField label="Slug" hint="Used in your store URL — contact support to change">
                        <input
                            value={store.slug}
                            readOnly
                            className="settings-input opacity-50 cursor-not-allowed select-none"
                        />
                    </SettingsField>
                </div>

                <div className="mt-5">
                    <SettingsField label="Description">
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Tell customers what you sell…"
                            rows={3}
                            className="settings-input"
                        />
                    </SettingsField>
                </div>
            </SettingsSection>

            {/* ── Locale ── */}
            <SettingsSection
                title="Locale"
                description="Currency and timezone for your storefront"
            >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                    <SettingsField label="Currency">
                        <select
                            value={currency}
                            onChange={(e) => setCurrency(e.target.value)}
                            className="settings-input"
                        >
                            {CURRENCIES.map((c) => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </SettingsField>

                    <SettingsField label="Timezone">
                        <select
                            value={timezone}
                            onChange={(e) => setTimezone(e.target.value)}
                            className="settings-input"
                        >
                            {TIMEZONES.map((tz) => (
                                <option key={tz} value={tz}>{tz}</option>
                            ))}
                        </select>
                    </SettingsField>
                </div>
            </SettingsSection>

            {/* ── Visibility — Render-style: label left, control right, full-width row ── */}
            <SettingsSection>
                <div className="flex items-center justify-between gap-8">
                    <div>
                        <p className="text-[13px] font-medium text-foreground">Store active</p>
                        <p className="text-[12px] text-on-surface-muted mt-0.5">
                            When off, visitors see a coming soon page instead of your store
                        </p>
                    </div>
                    <Toggle on={isActive} onChange={setIsActive} />
                </div>
            </SettingsSection>

        </div>
    )
}

// ─── Toggle ───────────────────────────────────────────────────────────────────
// Sharp, minimal — matches the no-radius aesthetic

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
    return (
        <button
            role="switch"
            aria-checked={on}
            onClick={() => onChange(!on)}
            className={cn(
                'relative inline-flex h-5 w-9 shrink-0 cursor-pointer transition-colors duration-150',
                on ? 'bg-primary' : 'bg-outline-strong'
            )}
            style={{ borderRadius: 0 }}
        >
            <span
                className={cn(
                    'pointer-events-none absolute top-0.5 h-4 w-4 bg-white shadow-sm transition-transform duration-150',
                    on ? 'translate-x-[18px]' : 'translate-x-0.5'
                )}
                style={{ borderRadius: 0 }}
            />
        </button>
    )
}