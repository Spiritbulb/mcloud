'use client'

import { useState, useTransition } from 'react'
import { updateTraderField } from '../actions'
import { SettingSection, SaveButton } from '../settings-primitives'
import { cn } from '@mcloud/ui/utils'

type AppOption = {
    id: string
    label: string
    description: string
    icon: string
}

const APP_OPTIONS: AppOption[] = [
    { id: 'digits',       label: 'Digits',       description: 'Predict the last digit of price',      icon: 'pin' },
    { id: 'accumulators', label: 'Accumulators', description: 'Grow your payout on every tick',       icon: 'show_chart' },
    { id: 'rise-fall',    label: 'Rise / Fall',  description: 'Predict if price rises or falls',      icon: 'trending_up' },
    { id: 'analytics',    label: 'Analytics',    description: 'Charts and market analysis tools',     icon: 'analytics' },
]

type Props = {
    app: { slug: string; enabled_apps: unknown }
    orgSlug: string
    traderSlug: string
}

export default function AppsClient({ app, orgSlug, traderSlug }: Props) {
    const initial = Array.isArray(app.enabled_apps) ? (app.enabled_apps as string[]) : ['digits', 'accumulators', 'rise-fall', 'analytics']
    const [enabled, setEnabled] = useState<string[]>(initial)
    const [error, setError] = useState<string | null>(null)
    const [saved, setSaved] = useState(false)
    const [isPending, start] = useTransition()

    const toggle = (id: string) => {
        setEnabled(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id])
    }

    const submit = (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setSaved(false)
        start(async () => {
            const res = await updateTraderField(orgSlug, traderSlug, { enabled_apps: enabled })
            if (res.error) { setError(res.error); return }
            setSaved(true)
        })
    }

    return (
        <form onSubmit={submit} className="max-w-2xl space-y-8">
            <div>
                <h1 className="text-[16px] font-semibold text-[var(--md-sys-color-on-surface)]">Enabled Apps</h1>
                <p className="text-[12px] text-[var(--md-sys-color-on-surface-variant)] mt-0.5">
                    Choose which trading sub-apps are available in this white-label
                </p>
            </div>

            <SettingSection label="Sub-apps">
                <div className="divide-y divide-[var(--md-sys-color-outline-variant)]">
                    {APP_OPTIONS.map(option => {
                        const isEnabled = enabled.includes(option.id)
                        return (
                            <div key={option.id} className="flex items-center justify-between px-5 py-4">
                                <div className="flex items-center gap-3">
                                    <span className={cn(
                                        'material-symbols-outlined select-none leading-none text-[20px]',
                                        isEnabled ? 'text-[var(--md-sys-color-primary)]' : 'text-[var(--md-sys-color-on-surface-variant)]'
                                    )}>
                                        {option.icon}
                                    </span>
                                    <div>
                                        <p className="text-[13px] font-medium text-[var(--md-sys-color-on-surface)]">{option.label}</p>
                                        <p className="text-[11px] text-[var(--md-sys-color-on-surface-variant)]">{option.description}</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => toggle(option.id)}
                                    className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${isEnabled ? 'bg-[var(--md-sys-color-primary)]' : 'bg-[var(--md-sys-color-surface-variant)]'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${isEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>
                        )
                    })}
                </div>
            </SettingSection>

            {error && <p className="text-[13px] text-[var(--md-sys-color-error)]">{error}</p>}
            <SaveButton isPending={isPending} saved={saved} />
        </form>
    )
}
