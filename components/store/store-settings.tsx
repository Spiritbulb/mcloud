'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/client'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Loader2, Store, Palette, Globe, Link2, CreditCard, Bell, Package, ShoppingBag } from 'lucide-react'

import DomainSettings from './domain-settings'
import PaymentSettings from './payment-settings'
import { SettingsHeader, SettingsNav } from './settings-header'
import GeneralSettings from './general-settings'
import AppearanceSettings from './appearance-settings'
import ProductSettings from './product-settings'
import OrderSettings from './order-settings'

interface HeroSlide {
    title: string
    subtitle?: string
    image?: string
    imagePath?: string
    accent?: string
    buttonText?: string
}

interface StoreData {
    id: string
    name: string
    slug: string
    description: string | null
    logo_url: string | null
    currency: string
    timezone: string
    custom_domain: string | null
    is_active: boolean
    settings: {
        primaryColor?: string
        heroTitle?: string
        heroSubtitle?: string
        heroImage?: string
        logoPath?: string
        heroSlides?: HeroSlide[]
        heroImagePath?: string
        themeId?: string
        socialLinks?: {
            instagram?: string
            twitter?: string
            tiktok?: string
            whatsapp?: string
        }
    }
    theme?: {
        primary_color?: string
        secondary_color?: string
        accent_color?: string
        background_color?: string
        foreground_color?: string
        muted_color?: string
        dark_primary_color?: string
        dark_background_color?: string
        dark_foreground_color?: string
        dark_muted_color?: string
        heading_font?: string
        body_font?: string
        border_radius?: string
    }
}

interface Tab {
    id: string
    label: string
    icon: React.ReactNode
    pro?: boolean
}

const TABS: Tab[] = [
    { id: 'general', label: 'General', icon: <Store className="w-4 h-4" /> },
    { id: 'appearance', label: 'Appearance', icon: <Palette className="w-4 h-4" /> },
    { id: 'products', label: 'Products', icon: <Package className="w-4 h-4" /> },
    { id: 'orders', label: 'Orders', icon: <ShoppingBag className="w-4 h-4" /> },
    { id: 'domain', label: 'Domain', icon: <Globe className="w-4 h-4" />, pro: true },
    { id: 'social', label: 'Social', icon: <Link2 className="w-4 h-4" /> },
    { id: 'payments', label: 'Payments', icon: <CreditCard className="w-4 h-4" />, pro: true },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" />, pro: true },
]

function SaveToast({ saving, saved }: { saving: boolean; saved: boolean }) {
    return (
        <AnimatePresence>
            {(saving || saved) && (
                <motion.div
                    initial={{ opacity: 0, y: 12, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 12, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="fixed bottom-6 right-6 z-50"
                >
                    <div className="flex items-center gap-2 rounded-lg border bg-background shadow-lg px-4 py-2.5 text-sm">
                        {saving ? (
                            <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                                <span className="text-muted-foreground">Saving…</span>
                            </>
                        ) : (
                            <>
                                <Check className="w-3.5 h-3.5 text-green-600" />
                                <span className="text-foreground font-medium">Saved</span>
                            </>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

function ProGate({ feature, setActiveTab }: { feature: string; setActiveTab: (tab: string) => void }) {
    return (
        <Card className="border-dashed">
            <CardContent className="py-12 text-center space-y-3">
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                    {feature} is not available yet. Please check back soon.
                </p>
                <Button variant="outline" size="sm" className="h-8 px-5 text-xs mt-1" onClick={() => setActiveTab('general')}>
                    Go back
                </Button>
            </CardContent>
        </Card>
    )
}

export default function StoreSettings({ store }: { store: StoreData }) {
    const [activeTab, setActiveTab] = useState('general')
    const [navOpen, setNavOpen] = useState(false)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    const activeLabel = TABS.find((t) => t.id === activeTab)?.label ?? 'General'

    // ── General ───────────────────────────────────────────────────────────────
    const [name, setName] = useState(store.name)
    const [description, setDescription] = useState(store.description ?? '')
    const [currency, setCurrency] = useState(store.currency)
    const [timezone, setTimezone] = useState(store.timezone)
    const [isActive, setIsActive] = useState(store.is_active)

    // ── Appearance — hero content ─────────────────────────────────────────────
    // Initialised empty; the useEffect below hydrates from DB values.
    // This prevents the color pickers flashing wrong defaults when store.theme
    // arrives after the initial render (or wasn't joined in the server query).
    const [themeId, setThemeId] = useState('')
    const [heroTitle, setHeroTitle] = useState('')
    const [heroSubtitle, setHeroSubtitle] = useState('')
    const [heroImage, setHeroImage] = useState('')
    const [logoUrl, setLogoUrl] = useState('')
    const [logoPath, setLogoPath] = useState('')
    const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([])
    const [heroImagePath, setHeroImagePath] = useState('')

    // ── Theme tokens ──────────────────────────────────────────────────────────
    const [primaryColor, setPrimaryColor] = useState('')
    const [secondaryColor, setSecondaryColor] = useState('')
    const [accentColor, setAccentColor] = useState('')
    const [bgColor, setBgColor] = useState('')
    const [fgColor, setFgColor] = useState('')
    const [mutedColor, setMutedColor] = useState('')
    const [darkPrimaryColor, setDarkPrimaryColor] = useState('')
    const [darkBgColor, setDarkBgColor] = useState('')
    const [darkFgColor, setDarkFgColor] = useState('')
    const [darkMutedColor, setDarkMutedColor] = useState('')
    const [headingFont, setHeadingFont] = useState('')
    const [bodyFont, setBodyFont] = useState('')
    const [borderRadius, setBorderRadius] = useState('')

    // ── Hydrate appearance state from DB ──────────────────────────────────────
    // Keyed on store.id so it re-runs if a different store is loaded.
    // All DB values take precedence; hardcoded strings here are last-resort
    // fallbacks only used when the DB row genuinely has no value.
    useEffect(() => {
        const s = store.settings ?? {}
        const t = store.theme ?? {}

        setThemeId(s.themeId ?? 'classic')
        setHeroTitle(s.heroTitle ?? store.name ?? '')
        setHeroSubtitle(s.heroSubtitle ?? store.description ?? '')
        setHeroImage(s.heroImage ?? '')
        setHeroImagePath(s.heroImagePath ?? '')
        setHeroSlides(s.heroSlides ?? [])
        setLogoUrl(store.logo_url ?? '')
        setLogoPath(s.logoPath ?? '')

        setPrimaryColor(t.primary_color ?? '#1c2228')
        setSecondaryColor(t.secondary_color ?? '#f5f0eb')
        setAccentColor(t.accent_color ?? '#c9a96e')
        setBgColor(t.background_color ?? '#ffffff')
        setFgColor(t.foreground_color ?? '#1c2228')
        setMutedColor(t.muted_color ?? '#f4f4f5')
        setDarkPrimaryColor(t.dark_primary_color ?? '#e8e0d8')
        setDarkBgColor(t.dark_background_color ?? '#0f0f10')
        setDarkFgColor(t.dark_foreground_color ?? '#f0ece6')
        setDarkMutedColor(t.dark_muted_color ?? '#1e1e20')
        setHeadingFont(t.heading_font ?? 'Playfair Display')
        setBodyFont(t.body_font ?? 'Inter')
        setBorderRadius(t.border_radius ?? '0px')
    }, [store.id]) // eslint-disable-line react-hooks/exhaustive-deps

    // ── Social ────────────────────────────────────────────────────────────────
    const [instagram, setInstagram] = useState(store.settings?.socialLinks?.instagram ?? '')
    const [tiktok, setTiktok] = useState(store.settings?.socialLinks?.tiktok ?? '')
    const [twitter, setTwitter] = useState(store.settings?.socialLinks?.twitter ?? '')
    const [whatsapp, setWhatsapp] = useState(store.settings?.socialLinks?.whatsapp ?? '')

    // ── Save ──────────────────────────────────────────────────────────────────
    const handleSave = async () => {
        setSaving(true)
        const supabase = createClient()

        const { error: storeError } = await supabase
            .from('stores')
            .update({
                name,
                description: description || null,
                currency,
                timezone,
                is_active: isActive,
                logo_url: logoUrl || null,
                settings: {
                    ...store.settings,
                    themeId: themeId || undefined,
                    heroTitle: heroTitle || undefined,
                    heroSubtitle: heroSubtitle || undefined,
                    heroImage: heroImage || undefined,
                    logoPath: logoPath || undefined,
                    heroSlides: heroSlides.length > 0 ? heroSlides : undefined,
                    heroImagePath: heroImagePath || undefined,
                    socialLinks: {
                        instagram: instagram || undefined,
                        tiktok: tiktok || undefined,
                        twitter: twitter || undefined,
                        whatsapp: whatsapp || undefined,
                    },
                },
            })
            .eq('id', store.id)

        if (storeError) console.error('Store save error:', storeError)

        const { error: themeError } = await supabase
            .from('store_themes')
            .upsert(
                {
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
                },
                { onConflict: 'store_id' }
            )

        if (themeError) console.error('Theme save error:', themeError)

        setSaving(false)
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
    }

    return (
        <div className="min-h-screen bg-background">
            <SettingsHeader
                store={store}
                handleSave={handleSave}
                saving={saving}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                activeLabel={activeLabel}
                onMenuOpen={() => setNavOpen(true)}
            />

            <div className="container mx-auto px-6 md:px-8">
                <div className="flex flex-col md:flex-row gap-6 max-w-7xl">
                    <SettingsNav
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                        TABS={TABS}
                        open={navOpen}
                        onClose={() => setNavOpen(false)}
                    />

                    <div className="flex-1 min-w-0 pt-8 pb-16">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                transition={{ duration: 0.12 }}
                                className="space-y-6"
                            >
                                {/* General */}
                                {activeTab === 'general' && (
                                    <GeneralSettings
                                        store={store}
                                        activeTab={activeTab}
                                        setActiveTab={setActiveTab}
                                        TABS={TABS}
                                        name={name} setName={setName}
                                        description={description} setDescription={setDescription}
                                        currency={currency} setCurrency={setCurrency}
                                        timezone={timezone} setTimezone={setTimezone}
                                        isActive={isActive} setIsActive={setIsActive}
                                        logoUrl={logoUrl} setLogoUrl={setLogoUrl}
                                    />
                                )}

                                {/* Appearance */}
                                {activeTab === 'appearance' && (
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
                                )}

                                {/* Products */}
                                {activeTab === 'products' && (
                                    <ProductSettings storeId={store.id} currency={currency} />
                                )}

                                {/* Orders */}
                                {activeTab === 'orders' && (
                                    <OrderSettings storeId={store.id} currency={currency} />
                                )}

                                {/* Domain */}
                                {activeTab === 'domain' && (
                                    <DomainSettings storeId={store.id} currentDomain={store.custom_domain} />
                                )}

                                {/* Social */}
                                {activeTab === 'social' && (
                                    <div className="space-y-6">
                                        <div>
                                            <h2 className="text-base font-semibold text-foreground">Social Links</h2>
                                            <p className="text-sm text-muted-foreground mt-0.5">
                                                Show up where your audience already is
                                            </p>
                                        </div>
                                        <div className="space-y-4 max-w-md">
                                            {[
                                                { label: 'Instagram', placeholder: 'https://instagram.com/yourhandle', value: instagram, set: setInstagram },
                                                { label: 'TikTok', placeholder: 'https://tiktok.com/@yourhandle', value: tiktok, set: setTiktok },
                                                { label: 'Twitter / X', placeholder: 'https://x.com/yourhandle', value: twitter, set: setTwitter },
                                                { label: 'WhatsApp number', placeholder: '2547XXXXXXXX', value: whatsapp, set: setWhatsapp },
                                            ].map((field) => (
                                                <div key={field.label} className="space-y-1.5">
                                                    <Label htmlFor={field.label}>{field.label}</Label>
                                                    <Input
                                                        id={field.label}
                                                        value={field.value}
                                                        onChange={(e) => field.set(e.target.value)}
                                                        placeholder={field.placeholder}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Payments */}
                                {activeTab === 'payments' && (
                                    <PaymentSettings storeId={store.id} />
                                )}

                                {/* Notifications */}
                                {activeTab === 'notifications' && (
                                    <div className="space-y-6">
                                        <div>
                                            <h2 className="text-base font-semibold text-foreground">Notifications</h2>
                                            <p className="text-sm text-muted-foreground mt-0.5">
                                                Get notified when orders come in via WhatsApp
                                            </p>
                                        </div>
                                        <ProGate feature="WhatsApp order notifications" setActiveTab={setActiveTab} />
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            <SaveToast saving={saving} saved={saved} />
        </div>
    )
}