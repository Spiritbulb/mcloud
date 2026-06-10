'use client'

import { useState, useTransition } from 'react'
import { updateTraderField } from '../actions'
import { SettingRow, SettingSection, SaveButton } from '../settings-primitives'

type Props = {
    app: { slug: string; deriv_app_id: string; deriv_redirect_uri: string; deriv_oauth_scopes: string | null }
    orgSlug: string
    traderSlug: string
}

const SCOPE_OPTIONS = ['read', 'trade', 'trading_information', 'payments', 'admin'] as const

export default function DerivClient({ app, orgSlug, traderSlug }: Props) {
    const [derivAppId, setDerivAppId] = useState(app.deriv_app_id)
    const [derivRedirectUri, setDerivRedirectUri] = useState(app.deriv_redirect_uri)
    const [scopes, setScopes] = useState<string[]>((app.deriv_oauth_scopes ?? 'trade').split(',').map(s => s.trim()).filter(Boolean))
    const [error, setError] = useState<string | null>(null)
    const [saved, setSaved] = useState(false)
    const [isPending, start] = useTransition()

    const toggleScope = (scope: string) => {
        setScopes(prev => prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope])
    }

    const submit = (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setSaved(false)
        start(async () => {
            const res = await updateTraderField(orgSlug, traderSlug, {
                deriv_app_id: derivAppId,
                deriv_redirect_uri: derivRedirectUri,
                deriv_oauth_scopes: scopes.join(','),
            })
            if (res.error) { setError(res.error); return }
            setSaved(true)
        })
    }

    return (
        <form onSubmit={submit} className="max-w-2xl space-y-8">
            <div>
                <h1 className="text-[16px] font-semibold text-[var(--md-sys-color-on-surface)]">Deriv OAuth</h1>
                <p className="text-[12px] text-[var(--md-sys-color-on-surface-variant)] mt-0.5">
                    Credentials registered at{' '}
                    <a href="https://app.deriv.com/account/api-token" target="_blank" rel="noopener noreferrer"
                        className="text-[var(--md-sys-color-primary)] hover:underline">app.deriv.com</a>
                </p>
            </div>

            <SettingSection label="OAuth credentials">
                <SettingRow label="App ID" description="The numeric Deriv App ID assigned to this white-label">
                    <input
                        value={derivAppId}
                        onChange={e => setDerivAppId(e.target.value)}
                        required
                        placeholder="12345"
                        className="w-full h-10 rounded-xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-variant)]/30 px-4 text-[14px] font-mono focus:outline-none focus:border-[var(--md-sys-color-primary)] focus:ring-2 focus:ring-[var(--md-sys-color-primary)]/15 transition-all"
                    />
                </SettingRow>
                <SettingRow label="Redirect URI" description="Must match exactly what's registered on Deriv">
                    <input
                        value={derivRedirectUri}
                        onChange={e => setDerivRedirectUri(e.target.value)}
                        required
                        type="url"
                        placeholder="https://yourdomain.com/callback"
                        className="w-full h-10 rounded-xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-variant)]/30 px-4 text-[14px] focus:outline-none focus:border-[var(--md-sys-color-primary)] focus:ring-2 focus:ring-[var(--md-sys-color-primary)]/15 transition-all"
                    />
                </SettingRow>
                <SettingRow label="OAuth scopes" description="Permissions requested during trader login" fullWidth>
                    <div className="flex flex-wrap gap-2">
                        {SCOPE_OPTIONS.map(scope => (
                            <button
                                key={scope}
                                type="button"
                                onClick={() => toggleScope(scope)}
                                className={`h-8 px-3 rounded-full text-[12px] font-medium border transition-colors ${
                                    scopes.includes(scope)
                                        ? 'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] border-transparent'
                                        : 'border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-variant)]'
                                }`}
                            >
                                {scope}
                            </button>
                        ))}
                    </div>
                </SettingRow>
            </SettingSection>

            {error && <p className="text-[13px] text-[var(--md-sys-color-error)]">{error}</p>}
            <SaveButton isPending={isPending} saved={saved} />
        </form>
    )
}
