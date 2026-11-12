// Brand settings read by the storefront header and the Brand page: logo size, the
// optional dark-mode logo and the colour mode. Stored in stores.settings. Every reader
// goes through these, so a bad stored value falls back to the default instead of
// reaching a style attribute.

export const COLOR_MODES = ['auto', 'light', 'dark'] as const
export type ColorMode = (typeof COLOR_MODES)[number]

export const LOGO_SIZES = ['sm', 'md', 'lg'] as const
export type LogoSize = (typeof LOGO_SIZES)[number]

/** Header bar is 56px tall; the largest logo leaves room above and below. */
const LOGO_DIMENSIONS: Record<LogoSize, { height: number; maxWidth: number }> = {
    sm: { height: 28, maxWidth: 140 },
    md: { height: 40, maxWidth: 220 },
    lg: { height: 48, maxWidth: 300 },
}

type Settings = Record<string, unknown> | null | undefined

export function colorModeFrom(settings: Settings): ColorMode {
    const v = settings?.colorMode
    return COLOR_MODES.includes(v as ColorMode) ? (v as ColorMode) : 'auto'
}

export function logoSizeFrom(settings: Settings): LogoSize {
    const v = settings?.logoSize
    return LOGO_SIZES.includes(v as LogoSize) ? (v as LogoSize) : 'md'
}

/** Inline style for the header logo. Width is capped to the viewport so a wide logo never pushes the cart off a phone. */
export function logoStyle(size: LogoSize): { height: number; maxWidth: string } {
    const d = LOGO_DIMENSIONS[size]
    return { height: d.height, maxWidth: `min(${d.maxWidth}px, 55vw)` }
}

/** The dark-mode logo, only when one is set and the store has a light logo to pair it with. */
export function darkLogoFrom(logoUrl: string | null | undefined, settings: Settings): string | null {
    const v = settings?.logoDarkUrl
    return logoUrl && typeof v === 'string' && v ? v : null
}
