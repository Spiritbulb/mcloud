// Pure helpers for the Brand page: what to save, whether anything changed, and the
// colours/fonts summary. Colours, fonts and layout are edited in the Editor, not here.

import { colorModeFrom, logoSizeFrom, type ColorMode, type LogoSize } from '@/lib/brand'

export type BrandDraft = {
    logoUrl: string
    logoPath: string
    logoDarkUrl: string
    logoDarkPath: string
    logoSize: LogoSize
    iconUrl: string
    iconPath: string
    colorMode: ColorMode
}

const FIELDS: (keyof BrandDraft)[] = ['logoUrl', 'logoPath', 'logoDarkUrl', 'logoDarkPath', 'logoSize', 'iconUrl', 'iconPath', 'colorMode']

export function isBrandDirty(a: BrandDraft, b: BrandDraft): boolean {
    return FIELDS.some((k) => a[k] !== b[k])
}

/** The draft the page starts from, out of the store row's columns and its settings. */
export function draftFromStore(
    store: { logo_url: string | null; icon_url: string | null },
    settings: Record<string, unknown>,
): BrandDraft {
    const str = (v: unknown) => (typeof v === 'string' ? v : '')
    return {
        logoUrl: store.logo_url ?? '',
        logoPath: str(settings.logoPath),
        logoDarkUrl: str(settings.logoDarkUrl),
        logoDarkPath: str(settings.logoDarkPath),
        logoSize: logoSizeFrom(settings),
        iconUrl: store.icon_url ?? '',
        iconPath: str(settings.iconPath),
        colorMode: colorModeFrom(settings),
    }
}

/**
 * Column writes for `stores`, plus the keys to MERGE into stores.settings (patchStoreSettings),
 * so a hero or gallery change saved from the Editor meanwhile is not overwritten with a stale copy.
 * Cleared values are null: a merge cannot express "delete this key", and readers treat null as unset.
 */
export function brandPatch(d: BrandDraft) {
    return {
        columns: { logo_url: d.logoUrl || null, icon_url: d.iconUrl || null },
        settings: {
            logoPath: d.logoPath || null,
            logoDarkUrl: d.logoDarkUrl || null,
            logoDarkPath: d.logoDarkPath || null,
            logoSize: d.logoSize,
            iconPath: d.iconPath || null,
            colorMode: d.colorMode,
        },
    }
}

export type ThemeSummary = {
    swatches: { label: string; color: string }[]
    headingFont: string
    bodyFont: string
}

const HEX = /^#[0-9a-fA-F]{3,8}$/

/** Colours/fonts for the read-only summary. Anything that is not a plain hex falls back, so it is safe in a style attribute. */
export function themeSummary(theme: Record<string, unknown> | null | undefined): ThemeSummary {
    const t = theme ?? {}
    const hex = (v: unknown, fallback: string) => (typeof v === 'string' && HEX.test(v) ? v : fallback)
    const font = (v: unknown, fallback: string) => (typeof v === 'string' && v.trim() ? v.trim() : fallback)
    return {
        swatches: [
            { label: 'Primary', color: hex(t.primary_color, '#1c2228') },
            { label: 'Secondary', color: hex(t.secondary_color, '#f5f0eb') },
            { label: 'Accent', color: hex(t.accent_color, '#c9a96e') },
            { label: 'Background', color: hex(t.background_color, '#ffffff') },
        ],
        headingFont: font(t.heading_font, 'Playfair Display'),
        bodyFont: font(t.body_font, 'Inter'),
    }
}
