'use client'

import { useState } from 'react'
import { createClient } from '@/lib/client'
import { SaveBar, SaveToast } from '../settings-primitives'
import AppearanceSettings from '@/components/store/appearance-settings'

export default function AppearanceSettingsPage({ store }: { store: any }) {
    const s = store.settings ?? {}
    const t = store.theme ?? {}

    const [themeId, setThemeId] = useState(s.themeId ?? 'classic')
    const [heroTitle, setHeroTitle] = useState(s.heroTitle ?? store.name ?? '')
    const [heroSubtitle, setHeroSubtitle] = useState(s.heroSubtitle ?? store.description ?? '')
    const [heroImage, setHeroImage] = useState(s.heroImage ?? '')
    const [heroImagePath, setHeroImagePath] = useState(s.heroImagePath ?? '')
    const [heroSlides, setHeroSlides] = useState(s.heroSlides ?? [])
    const [logoUrl, setLogoUrl] = useState(store.logo_url ?? '')
    const [logoPath, setLogoPath] = useState(s.logoPath ?? '')
    const [primaryColor, setPrimaryColor] = useState(t.primary_color ?? '#1c2228')
    const [secondaryColor, setSecondaryColor] = useState(t.secondary_color ?? '#f5f0eb')
    const [accentColor, setAccentColor] = useState(t.accent_color ?? '#c9a96e')
    const [bgColor, setBgColor] = useState(t.background_color ?? '#ffffff')
    const [fgColor, setFgColor] = useState(t.foreground_color ?? '#1c2228')
    const [mutedColor, setMutedColor] = useState(t.muted_color ?? '#f4f4f5')
    const [darkPrimaryColor, setDarkPrimaryColor] = useState(t.dark_primary_color ?? '#e8e0d8')
    const [darkBgColor, setDarkBgColor] = useState(t.dark_background_color ?? '#0f0f10')
    const [darkFgColor, setDarkFgColor] = useState(t.dark_foreground_color ?? '#f0ece6')
    const [darkMutedColor, setDarkMutedColor] = useState(t.dark_muted_color ?? '#1e1e20')
    const [headingFont, setHeadingFont] = useState(t.heading_font ?? 'Playfair Display')
    const [bodyFont, setBodyFont] = useState(t.body_font ?? 'Inter')
    const [borderRadius, setBorderRadius] = useState(t.border_radius ?? '0px')

    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    const handleSave = async () => {
        setSaving(true)
        const supabase = createClient()

        await supabase.from('stores').update({
            logo_url: logoUrl || null,
            settings: {
                ...store.settings,
                themeId, heroTitle, heroSubtitle,
                heroImage: heroImage || undefined,
                logoPath: logoPath || undefined,
                heroSlides: heroSlides.length > 0 ? heroSlides : undefined,
                heroImagePath: heroImagePath || undefined,
            },
        }).eq('id', store.id)

        await supabase.from('store_themes').upsert({
            store_id: store.id,
            theme_id: themeId || 'classic',
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
            updated_at: new Date().toISOString(),
        }, { onConflict: 'store_id' })

        setSaving(false)
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
    }

    return (
        <>
            {/* AppearanceSettings root div must be `space-y-4`, NOT `h-screen` */}
            <AppearanceSettings
                store={store}
                themeId={themeId} setThemeId={setThemeId}
                heroTitle={heroTitle} setHeroTitle={setHeroTitle}
                heroSubtitle={heroSubtitle} setHeroSubtitle={setHeroSubtitle}
                heroImage={heroImage} setHeroImage={setHeroImage}
                logoUrl={logoUrl} setLogoUrl={setLogoUrl}
                logoPath={logoPath} setLogoPath={setLogoPath}
                heroSlides={heroSlides} setHeroSlides={setHeroSlides}
                heroImagePath={heroImagePath} setHeroImagePath={setHeroImagePath}
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
            <SaveBar onSave={handleSave} saving={saving} />
            <SaveToast saving={saving} saved={saved} />
        </>
    )
}