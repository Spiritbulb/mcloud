'use client'

import { useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button, buttonClass } from '@mcloud/ui/kit/button'
import { Notice } from '@mcloud/ui/kit/notice'
import { Panel } from '@mcloud/ui/kit/panel'
import { UPGRADE_TARGET, themeDef, type StoreThemeId } from '@/lib/store-themes'
import { adoptTheme } from './actions'

const subscribeNever = () => () => {}

function readFlag(key: string): boolean {
    try { return window.localStorage.getItem(key) === '1' } catch { return false }
}

/**
 * The opt-in to the new design. Shown only to a store still on the original Classic,
 * and only once the target theme is released. "Not now" is a per-browser
 * convenience (localStorage), never state the store depends on.
 */
export default function ThemeUpgradePanel({ slug, orgSlug, themeId }: { slug: string; orgSlug: string; themeId: StoreThemeId }) {
    const router = useRouter()
    const key = `mcloud:theme-panel-dismissed:${slug}`
    const [hiddenNow, setHiddenNow] = useState(false)
    // Read on the client only; the server render treats it as dismissed, so the panel
    // never flashes in and out for someone who already said "Not now".
    const stored = useSyncExternalStore(subscribeNever, () => readFlag(key), () => true)
    const dismissed = hiddenNow || stored
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const target = themeDef(UPGRADE_TARGET)
    if (themeId !== 'classic' || !target.released || dismissed) return null

    async function update() {
        setBusy(true)
        setError(null)
        const result = await adoptTheme(slug, UPGRADE_TARGET).catch(() => ({ error: 'Could not reach the server. Try again.' }))
        setBusy(false)
        if (result.error) setError(result.error)
        else router.refresh()
    }

    function notNow() {
        try { window.localStorage.setItem(key, '1') } catch { /* fine: it only hides for this visit */ }
        setHiddenNow(true)
    }

    return (
        <Panel title="New designs are available for your store.">
            <div className="space-y-3">
                <p className="text-[14px] text-muted-foreground">
                    {target.name}: {target.description} Your colours, products and pages stay as they are, and you can switch back in the Editor.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/org/${orgSlug}/${slug}/settings/editor?theme=${UPGRADE_TARGET}`} className={buttonClass('ghost', 'sm')}>
                        Preview
                    </Link>
                    <Button variant="primary" size="sm" onClick={() => void update()} disabled={busy}>
                        {busy ? 'Updating…' : 'Update'}
                    </Button>
                    <button type="button" onClick={notNow} className="ml-auto text-[13px] text-muted-foreground underline-offset-2 hover:underline">
                        Not now
                    </button>
                </div>
                {error && <Notice tone="error">{error}</Notice>}
            </div>
        </Panel>
    )
}
