'use client'

/**
 * StoreSettingsAppearance — the parent component that:
 *  1. Receives `store` from the server (DB values)
 *  2. Initialises ALL local state from DB values via a single useEffect
 *  3. Passes state + setters down to AppearanceSettings
 *  4. Saves back to DB on submit
 *
 * THE BUG THAT WAS HERE BEFORE:
 *   State was initialised with useState(defaultValue) before the store prop
 *   was available, meaning the color pickers always showed hardcoded defaults
 *   even when the DB had different values. The fix is a useEffect that runs
 *   once when `store` is truthy and sets all state from DB values.
 */

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/client'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Loader2, Save } from 'lucide-react'
import AppearanceSettings from './appearance-settings'

// ─── Defaults (only used when DB value is absent) ─────────────────────────────
const DEFAULTS = {
    themeId: 'classic',
    heroTitle: '',
    heroSubtitle: '',
    heroImage: '',
    heroImagePath: '',
    logoUrl: '',
    logoPath: '',
    heroSlides: [] as any[],
    primaryColor: '#1c2228',
    secondaryColor: '#f5f0eb',
    accentColor: '#c9a96e',
    bgColor: '#ffffff',
    fgColor: '#1c2228',
    mutedColor: '#f4f4f5',
    darkPrimaryColor: '#e8e0d8',
    darkBgColor: '#0f0f10',
    darkFgColor: '#f0ece6',
    darkMutedColor: '#1e1e20',
    headingFont: 'Playfair Display',
    bodyFont: 'Inter',
    borderRadius: '0px',
}

interface StoreSettingsAppearanceProps {
    store: any // Full store row from DB including `theme` relation
    onSave?: () => void
}

export default function StoreSettingsAppearance({
    store,
    onSave,
}: StoreSettingsAppearanceProps) {
    const supabase = createClient()
    const [saving, setSaving] = useState(false)

    // ── All appearance state ──────────────────────────────────────────────────
    const [themeId, setThemeId] = useState(DEFAULTS.themeId)
    const [heroTitle, setHeroTitle] = useState(DEFAULTS.heroTitle)
    const [heroSubtitle, setHeroSubtitle] = useState(DEFAULTS.heroSubtitle)
    const [heroImage, setHeroImage] = useState(DEFAULTS.heroImage)
    const [heroImagePath, setHeroImagePath] = useState(DEFAULTS.heroImagePath)
    const [logoUrl, setLogoUrl] = useState(DEFAULTS.logoUrl)
    const [logoPath, setLogoPath] = useState(DEFAULTS.logoPath)
    const [heroSlides, setHeroSlides] = useState<any[]>(DEFAULTS.heroSlides)
    const [primaryColor, setPrimaryColor] = useState(DEFAULTS.primaryColor)
    const [secondaryColor, setSecondaryColor] = useState(DEFAULTS.secondaryColor)
    const [accentColor, setAccentColor] = useState(DEFAULTS.accentColor)
    const [bgColor, setBgColor] = useState(DEFAULTS.bgColor)
    const [fgColor, setFgColor] = useState(DEFAULTS.fgColor)
    const [mutedColor, setMutedColor] = useState(DEFAULTS.mutedColor)
    const [darkPrimaryColor, setDarkPrimaryColor] = useState(DEFAULTS.darkPrimaryColor)
    const [darkBgColor, setDarkBgColor] = useState(DEFAULTS.darkBgColor)
    const [darkFgColor, setDarkFgColor] = useState(DEFAULTS.darkFgColor)
    const [darkMutedColor, setDarkMutedColor] = useState(DEFAULTS.darkMutedColor)
    const [headingFont, setHeadingFont] = useState(DEFAULTS.headingFont)
    const [bodyFont, setBodyFont] = useState(DEFAULTS.bodyFont)
    const [borderRadius, setBorderRadius] = useState(DEFAULTS.borderRadius)

    // ── Hydrate state from DB once store is available ─────────────────────────
    // This runs whenever `store` changes (e.g. after a parent re-fetch).
    // Using a stable reference via JSON.stringify so it only re-runs on real changes.
    const storeJson = JSON.stringify({ id: store?.id, settings: store?.settings, theme: store?.theme })

    useEffect(() => {
        if (!store) return

        const s = store.settings ?? {}
        const t = store.theme ?? {}

        // Theme
        setThemeId(s.themeId ?? DEFAULTS.themeId)

        // Hero content (lives in settings)
        setHeroTitle(s.heroTitle ?? store.name ?? DEFAULTS.heroTitle)
        setHeroSubtitle(s.heroSubtitle ?? store.description ?? DEFAULTS.heroSubtitle)
        setHeroImage(s.heroImage ?? DEFAULTS.heroImage)
        setHeroImagePath(s.heroImagePath ?? DEFAULTS.heroImagePath)
        setHeroSlides(s.heroSlides ?? DEFAULTS.heroSlides)

        // Logo (lives at top level + settings)
        setLogoUrl(store.logo_url ?? DEFAULTS.logoUrl)
        setLogoPath(s.logoPath ?? DEFAULTS.logoPath)

        // Colors (live in theme relation)
        setPrimaryColor(t.primary_color ?? DEFAULTS.primaryColor)
        setSecondaryColor(t.secondary_color ?? DEFAULTS.secondaryColor)
        setAccentColor(t.accent_color ?? DEFAULTS.accentColor)
        setBgColor(t.background_color ?? DEFAULTS.bgColor)
        setFgColor(t.foreground_color ?? DEFAULTS.fgColor)
        setMutedColor(t.muted_color ?? DEFAULTS.mutedColor)
        setDarkPrimaryColor(t.dark_primary_color ?? DEFAULTS.darkPrimaryColor)
        setDarkBgColor(t.dark_background_color ?? DEFAULTS.darkBgColor)
        setDarkFgColor(t.dark_foreground_color ?? DEFAULTS.darkFgColor)
        setDarkMutedColor(t.dark_muted_color ?? DEFAULTS.darkMutedColor)

        // Typography
        setHeadingFont(t.heading_font ?? DEFAULTS.headingFont)
        setBodyFont(t.body_font ?? DEFAULTS.bodyFont)
        setBorderRadius(t.border_radius ?? DEFAULTS.borderRadius)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [storeJson])

    // ── Save handler ──────────────────────────────────────────────────────────
    const handleSave = useCallback(async () => {
        setSaving(true)
        try {
            // 1. Update store settings (hero content, logo path, theme choice)
            const { error: settingsError } = await supabase
                .from('stores')
                .update({
                    logo_url: logoUrl || null,
                    settings: {
                        ...store.settings,
                        themeId,
                        heroTitle,
                        heroSubtitle,
                        heroImage,
                        heroImagePath,
                        heroSlides,
                        logoPath,
                    },
                })
                .eq('id', store.id)

            if (settingsError) throw settingsError

            // 2. Upsert theme tokens
            const { error: themeError } = await supabase
                .from('store_themes')
                .upsert(
                    {
                        store_id: store.id,
                        theme_id: themeId,
                        primary_color: primaryColor,
                        secondary_color: secondaryColor,
                        accent_color: accentColor,
                        background_color: bgColor,
                        foreground_color: fgColor,
                        muted_color: mutedColor,
                        dark_primary_color: darkPrimaryColor,
                        dark_background_color: darkBgColor,
                        dark_foreground_color: darkFgColor,
                        dark_muted_color: darkMutedColor,
                        heading_font: headingFont,
                        body_font: bodyFont,
                        border_radius: borderRadius,
                    },
                    { onConflict: 'store_id' }
                )

            if (themeError) throw themeError

            toast.success('Appearance saved')
            onSave?.()
        } catch (err: any) {
            console.error(err)
            toast.error(err.message || 'Failed to save appearance')
        } finally {
            setSaving(false)
        }
    }, [
        store.id, store.settings,
        themeId, heroTitle, heroSubtitle, heroImage, heroImagePath,
        heroSlides, logoUrl, logoPath,
        primaryColor, secondaryColor, accentColor, bgColor, fgColor, mutedColor,
        darkPrimaryColor, darkBgColor, darkFgColor, darkMutedColor,
        headingFont, bodyFont, borderRadius,
        supabase, onSave,
    ])

    return (
        <div className="space-y-8">
            <AppearanceSettings
                store={store}
                themeId={themeId} setThemeId={setThemeId}
                heroTitle={heroTitle} setHeroTitle={setHeroTitle}
                heroSubtitle={heroSubtitle} setHeroSubtitle={setHeroSubtitle}
                heroImage={heroImage} setHeroImage={setHeroImage}
                heroImagePath={heroImagePath} setHeroImagePath={setHeroImagePath}
                logoUrl={logoUrl} setLogoUrl={setLogoUrl}
                logoPath={logoPath} setLogoPath={setLogoPath}
                heroSlides={heroSlides} setHeroSlides={setHeroSlides}
                primaryColor={primaryColor} setPrimaryColor={setPrimaryColor}
                secondaryColor={secondaryColor} setSecondaryColor={setSecondaryColor}
                accentColor={accentColor} setAccentColor={setAccentColor}
                bgColor={bgColor} setBgColor={setBgColor}
                fgColor={fgColor} setFgColor={setFgColor}
                mutedColor={mutedColor} setMutedColor={setMutedColor}
                darkPrimaryColor={darkPrimaryColor} setDarkPrimaryColor={setDarkPrimaryColor}
                darkBgColor={darkBgColor} setDarkBgColor={setDarkBgColor}
                darkFgColor={darkFgColor} setDarkFgColor={setDarkFgColor}
                darkMutedColor={darkMutedColor} setDarkMutedColor={setDarkMutedColor}
                headingFont={headingFont} setHeadingFont={setHeadingFont}
                bodyFont={bodyFont} setBodyFont={setBodyFont}
                borderRadius={borderRadius} setBorderRadius={setBorderRadius}
            />

            {/* Sticky save bar */}
            <div className="sticky bottom-0 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3 border-t bg-background/95 backdrop-blur-sm z-10">
                <div className="max-w-screen-lg flex items-center justify-between gap-4">
                    <p className="text-xs text-muted-foreground hidden sm:block">
                        Changes are saved to your live storefront immediately.
                    </p>
                    <Button onClick={handleSave} disabled={saving} className="ml-auto">
                        {saving ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</>
                        ) : (
                            <><Save className="mr-2 h-4 w-4" />Save changes</>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    )
}