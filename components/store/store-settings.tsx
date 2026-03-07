'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/client'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Loader2, Store, Palette, Globe, Link2, CreditCard, Bell, Package, ShoppingBag } from 'lucide-react'
import { cn } from '@/lib/utils'

import DomainSettings from './domain-settings'
import PaymentSettings from './payment-settings'
import { SettingsHeader, SettingsNav } from './settings-header'
import GeneralSettings from './general-settings'
import AppearanceSettings from './appearance-settings'
import ProductSettings from './product-settings'
import OrderSettings from './order-settings'

// ─── Types ────────────────────────────────────────────────────────────────────

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
    { id: 'general', label: 'General', icon: <Store className="w-[15px] h-[15px]" /> },
    { id: 'appearance', label: 'Appearance', icon: <Palette className="w-[15px] h-[15px]" /> },
    { id: 'products', label: 'Products', icon: <Package className="w-[15px] h-[15px]" /> },
    { id: 'orders', label: 'Orders', icon: <ShoppingBag className="w-[15px] h-[15px]" /> },
    { id: 'domain', label: 'Domain', icon: <Globe className="w-[15px] h-[15px]" />, pro: true },
    { id: 'social', label: 'Social', icon: <Link2 className="w-[15px] h-[15px]" /> },
    { id: 'payments', label: 'Payments', icon: <CreditCard className="w-[15px] h-[15px]" />, pro: true },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-[15px] h-[15px]" />, pro: true },
]

// ─── SaveToast ────────────────────────────────────────────────────────────────

function SaveToast({ saving, saved }: { saving: boolean; saved: boolean }) {
    return (
        <AnimatePresence>
            {(saving || saved) && (
                <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.12, ease: 'easeOut' }}
                    className="fixed bottom-6 right-6 z-50"
                >
                    <div className="flex items-center gap-2.5 border border-outline bg-surface shadow-lg px-4 py-2.5 text-[13px]">
                        {saving ? (
                            <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-on-surface-muted" />
                                <span className="text-on-surface-muted">Saving…</span>
                            </>
                        ) : (
                            <>
                                <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                                <span className="text-foreground font-medium">Saved</span>
                            </>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

// ─── ProGate ──────────────────────────────────────────────────────────────────

function ProGate({ feature, setActiveTab }: { feature: string; setActiveTab: (tab: string) => void }) {
    return (
        <SettingsSection>
            <div className="py-16 text-center space-y-4">
                <p className="text-[13px] text-on-surface-muted max-w-sm mx-auto leading-relaxed">
                    {feature} isn't available yet — check back soon.
                </p>
                <button
                    onClick={() => setActiveTab('general')}
                    className="btn-secondary h-8 px-5 text-[13px]"
                >
                    Go back
                </button>
            </div>
        </SettingsSection>
    )
}

// ─── SocialSettings ───────────────────────────────────────────────────────────

function SocialSettings({
    instagram, setInstagram,
    tiktok, setTiktok,
    twitter, setTwitter,
    whatsapp, setWhatsapp,
}: {
    instagram: string; setInstagram: (v: string) => void
    tiktok: string; setTiktok: (v: string) => void
    twitter: string; setTwitter: (v: string) => void
    whatsapp: string; setWhatsapp: (v: string) => void
}) {
    const fields = [
        { label: 'Instagram', placeholder: 'https://instagram.com/yourhandle', value: instagram, set: setInstagram },
        { label: 'TikTok', placeholder: 'https://tiktok.com/@yourhandle', value: tiktok, set: setTiktok },
        { label: 'Twitter / X', placeholder: 'https://x.com/yourhandle', value: twitter, set: setTwitter },
        { label: 'WhatsApp', placeholder: '2547XXXXXXXX', value: whatsapp, set: setWhatsapp },
    ]

    return (
        <SettingsSection
            title="Social links"
            description="Show up where your audience already is"
        >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                {fields.map((f) => (
                    <SettingsField key={f.label} label={f.label}>
                        <input
                            value={f.value}
                            onChange={(e) => f.set(e.target.value)}
                            placeholder={f.placeholder}
                            className="settings-input"
                        />
                    </SettingsField>
                ))}
            </div>
        </SettingsSection>
    )
}

// ─── Layout primitives (exported for child settings components) ───────────────

export function SettingsSection({
    title,
    description,
    aside,
    children,
    noPadding,
}: {
    title?: string
    description?: string
    aside?: React.ReactNode
    children: React.ReactNode
    noPadding?: boolean
}) {
    return (
        <section className="border border-outline bg-surface">
            {(title || description) && (
                <div className="px-6 py-4 border-b border-outline flex items-start justify-between gap-4">
                    <div>
                        {title && (
                            <h3 className="text-[13px] font-semibold text-foreground leading-snug">{title}</h3>
                        )}
                        {description && (
                            <p className="text-[12px] text-on-surface-muted mt-0.5 leading-snug">{description}</p>
                        )}
                    </div>
                    {aside}
                </div>
            )}
            <div className={noPadding ? '' : 'px-6 py-5'}>
                {children}
            </div>
        </section>
    )
}

export function SettingsField({
    label,
    hint,
    children,
}: {
    label: string
    hint?: string
    children: React.ReactNode
}) {
    return (
        <div className="space-y-2">
            <label className="block text-[11px] font-semibold text-on-surface-muted uppercase tracking-[0.06em]">
                {label}
            </label>
            {children}
            {hint && (
                <p className="text-[11px] text-on-surface-muted/70 leading-snug">{hint}</p>
            )}
        </div>
    )
}

// ─── StoreSettings ────────────────────────────────────────────────────────────

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

    // ── Appearance ────────────────────────────────────────────────────────────
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

    // ── Social ────────────────────────────────────────────────────────────────
    const [instagram, setInstagram] = useState(store.settings?.socialLinks?.instagram ?? '')
    const [tiktok, setTiktok] = useState(store.settings?.socialLinks?.tiktok ?? '')
    const [twitter, setTwitter] = useState(store.settings?.socialLinks?.twitter ?? '')
    const [whatsapp, setWhatsapp] = useState(store.settings?.socialLinks?.whatsapp ?? '')

    // ── Hydrate ───────────────────────────────────────────────────────────────
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

            <div className="mx-auto max-w-[1400px]">
                <div className="flex">
                    <SettingsNav
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                        TABS={TABS}
                        open={navOpen}
                        onClose={() => setNavOpen(false)}
                    />

                    {/* Content pane */}
                    <main className="flex-1 min-w-0 px-8 md:px-12 pt-10 pb-24">

                        {/* Page title + save — Render puts these at the top of content */}
                        <div className="flex items-center justify-between mb-8">
                            <h1 className="text-[22px] font-semibold text-foreground tracking-tight">
                                {activeLabel}
                            </h1>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className={cn(
                                    'btn-primary inline-flex items-center gap-1.5 h-9 px-5 text-[13px] font-medium !rounded-none',
                                    saving && 'opacity-50 cursor-not-allowed'
                                )}
                            >
                                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                {saving ? 'Saving…' : 'Save changes'}
                            </button>
                        </div>

                        {/* Tab panels */}
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.1, ease: 'easeOut' }}
                                className="space-y-4"
                            >
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
                                {activeTab === 'products' && (
                                    <ProductSettings storeId={store.id} currency={currency} />
                                )}
                                {activeTab === 'orders' && (
                                    <OrderSettings storeId={store.id} currency={currency} />
                                )}
                                {activeTab === 'domain' && (
                                    <DomainSettings storeId={store.id} currentDomain={store.custom_domain} />
                                )}
                                {activeTab === 'social' && (
                                    <SocialSettings
                                        instagram={instagram} setInstagram={setInstagram}
                                        tiktok={tiktok} setTiktok={setTiktok}
                                        twitter={twitter} setTwitter={setTwitter}
                                        whatsapp={whatsapp} setWhatsapp={setWhatsapp}
                                    />
                                )}
                                {activeTab === 'payments' && (
                                    <PaymentSettings storeId={store.id} />
                                )}
                                {activeTab === 'notifications' && (
                                    <ProGate
                                        feature="WhatsApp order notifications"
                                        setActiveTab={setActiveTab}
                                    />
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </main>
                </div>
            </div>

            <SaveToast saving={saving} saved={saved} />
        </div>
    )
}