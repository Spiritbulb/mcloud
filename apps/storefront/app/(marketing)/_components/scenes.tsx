import type { ReactNode } from 'react'

// Spot scenes for the marketing pages, in the same line-and-soft-fill style as the dashboard's
// kit illustrations (@mcloud/ui/kit/illustrations). Inline SVG, no assets: strokes use
// currentColor (text-primary) and fills use the theme tokens, so they follow light and dark mode.
// Decorative, so hidden from screen readers; the text beside each one says the same thing.

export type SceneName = 'shop-live' | 'editor' | 'mpesa-prompt' | 'nonprofit'

const TINT = 'rgb(var(--primary) / 0.12)'
const SOFT = 'rgb(var(--primary) / 0.24)'
const CARD = 'rgb(var(--card))'
const GROUND = 'rgb(var(--muted) / 0.7)'
const OK = 'rgb(34 160 90)'

function Ground() {
    return <ellipse cx="80" cy="112" rx="58" ry="5" fill={GROUND} stroke="none" />
}

const SCENES: Record<SceneName, ReactNode> = {
    // A browser window showing a small shop, with a "Live" badge.
    'shop-live': (
        <>
            <Ground />
            <rect x="22" y="18" width="116" height="86" rx="6" fill={CARD} />
            <path d="M22 30 h116" />
            <circle cx="30" cy="24" r="1.6" fill="currentColor" stroke="none" />
            <circle cx="36" cy="24" r="1.6" fill="currentColor" stroke="none" />
            <rect x="46" y="21" width="58" height="6" rx="3" fill={TINT} stroke="none" />
            <rect x="30" y="38" width="100" height="22" rx="3" fill={SOFT} />
            <path d="M38 49 h30" />
            <rect x="30" y="66" width="30" height="30" rx="3" fill={TINT} />
            <rect x="65" y="66" width="30" height="30" rx="3" fill={TINT} />
            <rect x="100" y="66" width="30" height="30" rx="3" fill={TINT} />
            <rect x="104" y="8" width="40" height="16" rx="8" fill={CARD} />
            <circle cx="113" cy="16" r="3" fill={OK} stroke="none" />
            <path d="M120 16 h17" />
        </>
    ),
    // A colour palette and a slider beside a page being restyled.
    editor: (
        <>
            <Ground />
            <rect x="52" y="14" width="86" height="90" rx="6" fill={CARD} />
            <rect x="60" y="22" width="70" height="26" rx="3" fill={SOFT} />
            <path d="M60 58 h52 M60 66 h40" />
            <rect x="60" y="76" width="32" height="20" rx="3" fill={TINT} />
            <rect x="98" y="76" width="32" height="20" rx="3" fill={TINT} />
            <rect x="16" y="34" width="44" height="58" rx="6" fill={CARD} />
            <circle cx="28" cy="48" r="5" fill={SOFT} />
            <circle cx="44" cy="48" r="5" fill={TINT} />
            <circle cx="28" cy="64" r="5" fill="currentColor" stroke="none" opacity="0.7" />
            <circle cx="44" cy="64" r="5" fill={CARD} />
            <path d="M24 82 h28" />
            <circle cx="40" cy="82" r="3" fill={CARD} />
        </>
    ),
    // A phone showing an M-PESA payment prompt with a PIN field and a confirm tick.
    'mpesa-prompt': (
        <>
            <Ground />
            <rect x="52" y="6" width="56" height="102" rx="9" fill={CARD} />
            <path d="M72 12 h16" />
            <rect x="58" y="34" width="44" height="46" rx="4" fill={TINT} />
            <path d="M64 44 h32 M64 52 h22" />
            <rect x="64" y="60" width="32" height="10" rx="2" fill={CARD} />
            <path d="M69 65 h1 M74 65 h1 M79 65 h1 M84 65 h1" strokeWidth="3" />
            <rect x="64" y="88" width="32" height="10" rx="5" fill={SOFT} />
            <circle cx="124" cy="30" r="12" fill={CARD} />
            <path d="M118 30 l4 4 l8 -8" stroke={OK} />
            <path d="M24 52 c6 -4 10 -4 16 0 M28 60 c4 -3 6 -3 10 0" />
        </>
    ),
    // A donation jar filling with hearts, with a progress bar toward a goal.
    nonprofit: (
        <>
            <Ground />
            <path d="M56 36 h48 v6 c8 6 10 16 10 26 v30 a8 8 0 0 1 -8 8 h-52 a8 8 0 0 1 -8 -8 v-30 c0 -10 2 -20 10 -26 z" fill={CARD} />
            <rect x="54" y="28" width="52" height="10" rx="3" fill={SOFT} />
            <path d="M54 72 h52 v26 a6 6 0 0 1 -6 6 h-40 a6 6 0 0 1 -6 -6 z" fill={TINT} stroke="none" />
            <path d="M80 92 c-6 -4 -10 -7 -10 -12 a5 5 0 0 1 10 -2 a5 5 0 0 1 10 2 c0 5 -4 8 -10 12 z" fill={SOFT} />
            <path d="M120 22 c-3 -2 -5 -4 -5 -6 a2.6 2.6 0 0 1 5 -1 a2.6 2.6 0 0 1 5 1 c0 2 -2 4 -5 6 z" fill={SOFT} />
            <path d="M34 48 c-3 -2 -5 -4 -5 -6 a2.6 2.6 0 0 1 5 -1 a2.6 2.6 0 0 1 5 1 c0 2 -2 4 -5 6 z" fill={TINT} />
            <rect x="126" y="50" width="8" height="54" rx="4" fill={CARD} />
            <rect x="126" y="70" width="8" height="34" rx="4" fill={SOFT} stroke="none" />
        </>
    ),
}

export function Scene({ name, className }: { name: SceneName; className?: string }) {
    return (
        <svg
            viewBox="0 0 160 120"
            aria-hidden="true"
            focusable="false"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={['h-28 w-auto text-primary', className].filter(Boolean).join(' ')}
        >
            {SCENES[name]}
        </svg>
    )
}
