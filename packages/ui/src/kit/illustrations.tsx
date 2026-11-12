import type { ReactNode } from 'react'
import { cn } from '../utils'

// Small spot illustrations for the admin: empty states and the setup checklist. Inline SVG with
// no assets. Strokes use currentColor (the wrapper is text-primary) and fills use the theme
// tokens, so they follow light and dark mode. Decorative: hidden from screen readers.

export type IllustrationName = 'setup' | 'all-done' | 'first-sale' | 'first-donation'

const TINT = 'rgb(var(--primary) / 0.12)'
const SOFT = 'rgb(var(--primary) / 0.22)'
const CARD = 'rgb(var(--card))'
const GROUND = 'rgb(var(--muted) / 0.7)'

function Ground() {
    return <ellipse cx="60" cy="86" rx="40" ry="4" fill={GROUND} stroke="none" />
}

const ART: Record<IllustrationName, ReactNode> = {
    // A small shop with an awning and a checklist card beside it.
    setup: (
        <>
            <Ground />
            <rect x="18" y="38" width="52" height="46" rx="3" fill={CARD} />
            <path d="M14 38 l6 -14 h48 l6 14 z" fill={SOFT} />
            <path d="M14 38 q6.5 7 13 0 q6.5 7 13 0 q6.5 7 13 0 q6.5 7 13 0" fill={CARD} />
            <rect x="26" y="56" width="14" height="28" rx="1.5" fill={TINT} />
            <rect x="48" y="54" width="14" height="12" rx="1.5" fill={TINT} />
            <rect x="74" y="26" width="34" height="44" rx="4" fill={CARD} />
            <path d="M81 38 l3 3 l5 -6" />
            <path d="M81 50 l3 3 l5 -6" />
            <circle cx="85" cy="62" r="3.5" fill={CARD} />
            <path d="M94 38 h8 M94 50 h8 M94 62 h8" />
        </>
    ),
    // A pennant on a pole with a few sparkles: everything is done.
    'all-done': (
        <>
            <Ground />
            <path d="M44 84 V18" />
            <path d="M44 20 h38 l-8 11 l8 11 h-38 z" fill={SOFT} />
            <path d="M54 31 l5 5 l10 -10" />
            <path d="M88 52 v8 M84 56 h8" />
            <path d="M24 34 v6 M21 37 h6" />
            <circle cx="92" cy="28" r="2" fill="currentColor" stroke="none" />
            <circle cx="28" cy="60" r="2" fill="currentColor" stroke="none" />
        </>
    ),
    // A shopping bag with a coin dropping in.
    'first-sale': (
        <>
            <Ground />
            <path d="M32 40 h46 l4 44 h-54 z" fill={CARD} />
            <path d="M32 40 h46 l1 10 h-48 z" fill={TINT} />
            <path d="M44 46 v-10 a11 11 0 0 1 22 0 v10" fill="none" />
            <circle cx="88" cy="28" r="11" fill={SOFT} />
            <path d="M88 22 v12 M85 25 h5 a2.5 2.5 0 0 1 0 5 h-4 a2.5 2.5 0 0 0 0 5 h5" />
            <path d="M48 64 h14" />
        </>
    ),
    // An open hand holding a heart.
    'first-donation': (
        <>
            <Ground />
            <path d="M60 52 c-10 -7 -18 -12 -18 -21 a8.5 8.5 0 0 1 18 -4 a8.5 8.5 0 0 1 18 4 c0 9 -8 14 -18 21 z" fill={SOFT} />
            <path d="M20 66 h14 l12 -4 h18 a5 5 0 0 1 0 10 h-14" fill="none" />
            <path d="M34 66 v14 h-14" fill={TINT} />
            <path d="M50 72 h20 l18 -10 a5 5 0 0 1 6 8 l-22 14 h-38" fill={CARD} />
        </>
    ),
}

export function Illustration({ name, className }: { name: IllustrationName; className?: string }) {
    return (
        <svg
            viewBox="0 0 120 96"
            aria-hidden="true"
            focusable="false"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={cn('h-24 w-auto text-primary', className)}
        >
            {ART[name]}
        </svg>
    )
}
