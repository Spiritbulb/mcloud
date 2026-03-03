'use client'

import { useState } from 'react'
import { createClient } from '@/lib/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import DomainSettings from './domain-settings'
import PaymentSettings from './payment-settings'
import { Check, Store, Palette, Globe, Link2, CreditCard, Bell } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import ImageUpload from './image-upload'

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
    { id: 'domain', label: 'Domain', icon: <Globe className="w-4 h-4" />, pro: true },
    { id: 'social', label: 'Social', icon: <Link2 className="w-4 h-4" /> },
    { id: 'payments', label: 'Payments', icon: <CreditCard className="w-4 h-4" />, pro: true },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" />, pro: true },
]

const CURRENCIES = ['KES', 'USD', 'EUR', 'GBP', 'UGX', 'TZS']
const TIMEZONES = [
    'Africa/Nairobi', 'Africa/Lagos', 'Africa/Johannesburg',
    'Africa/Cairo', 'UTC', 'Europe/London', 'America/New_York',
]
const FONTS = [
    'Inter', 'Playfair Display', 'Lato', 'Montserrat',
    'Merriweather', 'Nunito', 'Raleway', 'Roboto',
]
const BORDER_RADII = [
    { label: 'Sharp', value: '0px' },
    { label: 'Slight', value: '4px' },
    { label: 'Rounded', value: '8px' },
    { label: 'Pill', value: '999px' },
]

// ─── Save feedback ────────────────────────────────────────────────────────────
function SaveBar({ saving, saved }: { saving: boolean; saved: boolean }) {
    return (
        <AnimatePresence>
            {(saving || saved) && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="fixed bottom-6 right-6 z-50"
                >
                    <div className="bg-foreground text-background px-4 py-2.5 text-sm flex items-center gap-2">
                        {saving ? (
                            <>
                                <span className="w-3.5 h-3.5 border-2 border-background border-t-transparent rounded-full animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Check className="w-3.5 h-3.5" />
                                Saved
                            </>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

// ─── Pro gate ─────────────────────────────────────────────────────────────────
function ProGate({ feature }: { feature: string }) {
    return (
        <div className="border border-dashed p-8 text-center space-y-3">
            <Badge variant="outline" className="text-xs">Pro feature</Badge>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                {feature} is available on the Pro plan. Upgrade to unlock it.
            </p>
            <Button className="google-button-primary rounded-none h-9 text-sm cursor-pointer">
                Upgrade to Pro
            </Button>
        </div>
    )
}

// ─── Color field helper ────────────────────────────────────────────────────────
function ColorField({ label, value, onChange }: {
    label: string
    value: string
    onChange: (v: string) => void
}) {
    return (
        <div className="grid gap-1.5">
            <Label className="text-xs">{label}</Label>
            <div className="flex items-center gap-2">
                <input
                    type="color"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-8 h-8 border cursor-pointer bg-background p-0.5"
                />
                <Input
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="#000000"
                    className="h-8 rounded-none font-mono text-xs w-32"
                />
            </div>
        </div>
    )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function StoreSettings({ store }: { store: StoreData }) {
    const [activeTab, setActiveTab] = useState('general')
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    // General
    const [name, setName] = useState(store.name)
    const [description, setDescription] = useState(store.description ?? '')
    const [currency, setCurrency] = useState(store.currency)
    const [timezone, setTimezone] = useState(store.timezone)
    const [isActive, setIsActive] = useState(store.is_active)

    // Appearance — legacy fields (hero content)
    const [heroTitle, setHeroTitle] = useState(store.settings?.heroTitle ?? '')
    const [heroSubtitle, setHeroSubtitle] = useState(store.settings?.heroSubtitle ?? '')
    const [heroImage, setHeroImage] = useState(store.settings?.heroImage ?? '')
    const [logoUrl, setLogoUrl] = useState(store.logo_url ?? '')
    const [logoPath, setLogoPath] = useState(store.settings?.logoPath ?? '')
    const [heroSlides, setHeroSlides] = useState<HeroSlide[]>(store.settings?.heroSlides ?? [])
    const [heroImagePath, setHeroImagePath] = useState(store.settings?.heroImagePath ?? '')

    // Theme colors (from store_themes table)
    const t = store.theme ?? {}
    const [primaryColor, setPrimaryColor] = useState(t.primary_color ?? '#1c2228')
    const [secondaryColor, setSecondaryColor] = useState(t.secondary_color ?? '#f5f0eb')
    const [accentColor, setAccentColor] = useState(t.accent_color ?? '#c9a96e')
    const [bgColor, setBgColor] = useState(t.background_color ?? '#ffffff')
    const [fgColor, setFgColor] = useState(t.foreground_color ?? '#1c2228')
    const [mutedColor, setMutedColor] = useState(t.muted_color ?? '#f4f4f5')
    const [darkPrimaryColor, setDarkPrimaryColor] = useState(t.dark_primary_color ?? '#e8e0d8')
    const [darkBgColor, setDarkBgColor] = useState(t.dark_background_color ?? '#0f0f10')
    const [darkFgColor, setDarkFgColor] = useState(t.dark_foreground_color ?? '#f0ece6')
    const [darkMutedColor, setDarkMutedColor] = useState(t.dark_muted_color ?? '#27272a')
    const [headingFont, setHeadingFont] = useState(t.heading_font ?? 'Playfair Display')
    const [bodyFont, setBodyFont] = useState(t.body_font ?? 'Inter')
    const [borderRadius, setBorderRadius] = useState(t.border_radius ?? '0px')

    // Social
    const [instagram, setInstagram] = useState(store.settings?.socialLinks?.instagram ?? '')
    const [tiktok, setTiktok] = useState(store.settings?.socialLinks?.tiktok ?? '')
    const [twitter, setTwitter] = useState(store.settings?.socialLinks?.twitter ?? '')
    const [whatsapp, setWhatsapp] = useState(store.settings?.socialLinks?.whatsapp ?? '')

    const handleSave = async () => {
        setSaving(true)
        const supabase = createClient()

        // 1. Update stores table (general + hero content)
        await supabase
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

        // 2. Upsert store_themes table
        await supabase
            .from('store_themes')
            .upsert(
                {
                    store_id: store.id,
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

        setSaving(false)
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="border-b">
                <div className="container mx-auto px-6 md:px-8 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <a href={`/store/${store.slug}`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                            ← {store.name}
                        </a>
                        <span className="text-muted-foreground">/</span>
                        <span className="text-sm font-medium">Settings</span>
                    </div>
                    <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="google-button-primary rounded-none h-8 text-sm px-4 cursor-pointer"
                    >
                        Save changes
                    </Button>
                </div>
            </div>

            <div className="container mx-auto px-6 md:px-8 py-8">
                <div className="flex flex-col md:flex-row gap-8 max-w-5xl">

                    {/* Sidebar tabs */}
                    <nav className="md:w-48 shrink-0">
                        <ul className="space-y-1">
                            {TABS.map((tab) => (
                                <li key={tab.id}>
                                    <button
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-sm transition-colors text-left ${activeTab === tab.id
                                            ? 'bg-foreground text-background'
                                            : 'text-muted-foreground hover:text-foreground hover:bg-surface'
                                            }`}
                                    >
                                        <span className="flex items-center gap-2.5">
                                            {tab.icon}
                                            {tab.label}
                                        </span>
                                        {tab.pro && (
                                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                                                Pro
                                            </Badge>
                                        )}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </nav>

                    {/* Tab content */}
                    <div className="flex-1 min-w-0">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.15 }}
                                className="space-y-6"
                            >

                                {/* ── GENERAL ──────────────────────────────────────── */}
                                {activeTab === 'general' && (
                                    <>
                                        <div>
                                            <h2 className="text-base font-semibold mb-1">General</h2>
                                            <p className="text-sm text-muted-foreground">Basic store information</p>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="grid gap-1.5">
                                                <Label className="text-sm">Store name</Label>
                                                <Input
                                                    value={name}
                                                    onChange={(e) => setName(e.target.value)}
                                                    className="h-9 rounded-none max-w-sm"
                                                />
                                            </div>

                                            <div className="grid gap-1.5">
                                                <Label className="text-sm">Description</Label>
                                                <textarea
                                                    value={description}
                                                    onChange={(e) => setDescription(e.target.value)}
                                                    rows={3}
                                                    placeholder="Tell customers what you sell..."
                                                    className="w-full max-w-sm border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring resize-none"
                                                />
                                            </div>

                                            <div className="grid gap-1.5">
                                                <Label className="text-sm">Currency</Label>
                                                <select
                                                    value={currency}
                                                    onChange={(e) => setCurrency(e.target.value)}
                                                    className="h-9 border bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring max-w-sm"
                                                >
                                                    {CURRENCIES.map((c) => (
                                                        <option key={c} value={c}>{c}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="grid gap-1.5">
                                                <Label className="text-sm">Timezone</Label>
                                                <select
                                                    value={timezone}
                                                    onChange={(e) => setTimezone(e.target.value)}
                                                    className="h-9 border bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring max-w-sm"
                                                >
                                                    {TIMEZONES.map((tz) => (
                                                        <option key={tz} value={tz}>{tz}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="flex items-center justify-between max-w-sm border p-3">
                                                <div>
                                                    <p className="text-sm font-medium">Store active</p>
                                                    <p className="text-xs text-muted-foreground">When off, your store shows a coming soon page</p>
                                                </div>
                                                <button
                                                    onClick={() => setIsActive(!isActive)}
                                                    className={`relative w-10 h-5 rounded-full transition-colors ${isActive ? 'bg-foreground' : 'bg-muted'
                                                        }`}
                                                >
                                                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${isActive ? 'left-[22px]' : 'left-0.5'
                                                        }`} />
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* ── APPEARANCE ───────────────────────────────────── */}
                                {activeTab === 'appearance' && (
                                    <>
                                        <div>
                                            <h2 className="text-base font-semibold mb-1">Appearance</h2>
                                            <p className="text-sm text-muted-foreground">Customize how your store looks</p>
                                        </div>

                                        <div className="space-y-6">

                                            {/* Logo */}
                                            <div className="grid gap-1.5">
                                                <ImageUpload
                                                    label="Store logo"
                                                    value={logoUrl}
                                                    pathInDb={logoPath}
                                                    onChange={(url, path) => {
                                                        setLogoUrl(url)
                                                        setLogoPath(path)
                                                    }}
                                                    bucket="store-assets"
                                                    pathPrefix={`${store.id}/logo`}
                                                    aspectRatio="square"
                                                />
                                                {logoUrl && (
                                                    <img src={logoUrl} alt="Logo preview" className="w-12 h-12 rounded-full object-cover mt-1" />
                                                )}
                                            </div>

                                            {/* ── Light mode colors ── */}
                                            <div className="space-y-3">
                                                <p className="text-sm font-medium">Light mode colors</p>
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                                    <ColorField label="Primary" value={primaryColor} onChange={setPrimaryColor} />
                                                    <ColorField label="Secondary" value={secondaryColor} onChange={setSecondaryColor} />
                                                    <ColorField label="Accent" value={accentColor} onChange={setAccentColor} />
                                                    <ColorField label="Background" value={bgColor} onChange={setBgColor} />
                                                    <ColorField label="Foreground" value={fgColor} onChange={setFgColor} />
                                                    <ColorField label="Muted" value={mutedColor} onChange={setMutedColor} />
                                                </div>
                                            </div>

                                            {/* ── Dark mode colors ── */}
                                            <div className="space-y-3">
                                                <p className="text-sm font-medium">Dark mode colors</p>
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                                    <ColorField label="Primary" value={darkPrimaryColor} onChange={setDarkPrimaryColor} />
                                                    <ColorField label="Background" value={darkBgColor} onChange={setDarkBgColor} />
                                                    <ColorField label="Foreground" value={darkFgColor} onChange={setDarkFgColor} />
                                                    <ColorField label="Muted" value={darkMutedColor} onChange={setDarkMutedColor} />
                                                </div>
                                            </div>

                                            {/* ── Typography ── */}
                                            <div className="space-y-3">
                                                <p className="text-sm font-medium">Typography</p>
                                                <div className="grid grid-cols-2 gap-4 max-w-sm">
                                                    <div className="grid gap-1.5">
                                                        <Label className="text-xs">Heading font</Label>
                                                        <select
                                                            value={headingFont}
                                                            onChange={(e) => setHeadingFont(e.target.value)}
                                                            className="h-8 border bg-background px-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                                                        >
                                                            {FONTS.map((f) => (
                                                                <option key={f} value={f}>{f}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div className="grid gap-1.5">
                                                        <Label className="text-xs">Body font</Label>
                                                        <select
                                                            value={bodyFont}
                                                            onChange={(e) => setBodyFont(e.target.value)}
                                                            className="h-8 border bg-background px-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                                                        >
                                                            {FONTS.map((f) => (
                                                                <option key={f} value={f}>{f}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* ── Border radius ── */}
                                            <div className="space-y-3">
                                                <p className="text-sm font-medium">Border radius</p>
                                                <div className="flex gap-2">
                                                    {BORDER_RADII.map((r) => (
                                                        <button
                                                            key={r.value}
                                                            onClick={() => setBorderRadius(r.value)}
                                                            className={`px-3 py-1.5 text-xs border transition-colors ${borderRadius === r.value
                                                                ? 'bg-foreground text-background border-foreground'
                                                                : 'text-muted-foreground border-border hover:border-foreground'
                                                                }`}
                                                        >
                                                            {r.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Live preview */}
                                            <div className="max-w-sm border p-4 space-y-2">
                                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Preview</p>
                                                <div
                                                    className="h-16 flex items-center justify-center"
                                                    style={{
                                                        backgroundColor: primaryColor,
                                                        borderRadius,
                                                    }}
                                                >
                                                    <span className="text-white font-semibold text-sm" style={{ fontFamily: headingFont }}>
                                                        {heroTitle || store.name}
                                                    </span>
                                                </div>

                                                <div className="flex gap-2 mt-2">
                                                    {[primaryColor, secondaryColor, accentColor, bgColor, fgColor, mutedColor].map((color, index) => (
                                                        <div
                                                            key={index}
                                                            className="w-6 h-6 border"
                                                            style={{ backgroundColor: color }}
                                                            title={color}
                                                        />
                                                    ))}
                                                </div>

                                            </div>

                                            {/* Hero content */}
                                            <div className="space-y-4 pt-2 border-t">
                                                <p className="text-sm font-medium pt-4">Hero content</p>

                                                <div className="grid gap-1.5">
                                                    <Label className="text-sm">Hero title</Label>
                                                    <Input
                                                        value={heroTitle}
                                                        onChange={(e) => setHeroTitle(e.target.value)}
                                                        placeholder={store.name}
                                                        className="h-9 rounded-none max-w-sm"
                                                    />
                                                </div>

                                                <div className="grid gap-1.5">
                                                    <Label className="text-sm">Hero subtitle</Label>
                                                    <Input
                                                        value={heroSubtitle}
                                                        onChange={(e) => setHeroSubtitle(e.target.value)}
                                                        placeholder="Free shipping on all orders"
                                                        className="h-9 rounded-none max-w-sm"
                                                    />
                                                </div>

                                                <div className="grid gap-1.5">
                                                    <Label className="text-sm">Hero image</Label>
                                                    <ImageUpload
                                                        label="Hero image"
                                                        value={heroImage}
                                                        pathInDb={heroImagePath}
                                                        onChange={(url, path) => {
                                                            setHeroImage(url)
                                                            setHeroImagePath(path)
                                                        }}
                                                        bucket="store-assets"
                                                        pathPrefix={`${store.id}/hero`}
                                                        aspectRatio="wide"
                                                    />
                                                    <p className="text-xs text-muted-foreground">
                                                        Displayed as background in your store hero section
                                                    </p>
                                                </div>

                                                {/* Hero Slides */}
                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <p className="text-sm font-medium">Hero slides</p>
                                                            <p className="text-xs text-muted-foreground">
                                                                Multiple slides replace the single hero. Leave empty to use the hero image above.
                                                            </p>
                                                        </div>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            className="rounded-none text-xs h-8"
                                                            onClick={() =>
                                                                setHeroSlides((prev) => [
                                                                    ...prev,
                                                                    { title: '', subtitle: '', accent: 'New Arrivals', buttonText: 'Shop now' },
                                                                ])
                                                            }
                                                        >
                                                            + Add slide
                                                        </Button>
                                                    </div>

                                                    {heroSlides.length === 0 && (
                                                        <p className="text-xs text-muted-foreground border border-dashed p-4 text-center">
                                                            No slides added — using hero image & title above as a single slide.
                                                        </p>
                                                    )}

                                                    <div className="space-y-4">
                                                        {heroSlides.map((slide, idx) => (
                                                            <div key={idx} className="border p-4 space-y-3">
                                                                <div className="flex items-center justify-between">
                                                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                                                        Slide {idx + 1}
                                                                    </p>
                                                                    <div className="flex items-center gap-2">
                                                                        <button
                                                                            type="button"
                                                                            disabled={idx === 0}
                                                                            onClick={() => {
                                                                                const next = [...heroSlides];
                                                                                [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
                                                                                setHeroSlides(next)
                                                                            }}
                                                                            className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30"
                                                                        >↑</button>
                                                                        <button
                                                                            type="button"
                                                                            disabled={idx === heroSlides.length - 1}
                                                                            onClick={() => {
                                                                                const next = [...heroSlides];
                                                                                [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
                                                                                setHeroSlides(next)
                                                                            }}
                                                                            className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30"
                                                                        >↓</button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setHeroSlides((prev) => prev.filter((_, i) => i !== idx))}
                                                                            className="text-xs text-destructive hover:underline"
                                                                        >Remove</button>
                                                                    </div>
                                                                </div>

                                                                <div className="grid gap-1.5">
                                                                    <Label className="text-xs">Title *</Label>
                                                                    <Input
                                                                        value={slide.title}
                                                                        onChange={(e) => {
                                                                            const next = [...heroSlides]
                                                                            next[idx] = { ...next[idx], title: e.target.value }
                                                                            setHeroSlides(next)
                                                                        }}
                                                                        placeholder="Your statement of confidence"
                                                                        className="h-8 rounded-none text-sm max-w-sm"
                                                                    />
                                                                </div>

                                                                <div className="grid gap-1.5">
                                                                    <Label className="text-xs">Subtitle</Label>
                                                                    <Input
                                                                        value={slide.subtitle ?? ''}
                                                                        onChange={(e) => {
                                                                            const next = [...heroSlides]
                                                                            next[idx] = { ...next[idx], subtitle: e.target.value }
                                                                            setHeroSlides(next)
                                                                        }}
                                                                        placeholder="Discover our bestsellers..."
                                                                        className="h-8 rounded-none text-sm max-w-sm"
                                                                    />
                                                                </div>

                                                                <div className="grid grid-cols-2 gap-3 max-w-sm">
                                                                    <div className="grid gap-1.5">
                                                                        <Label className="text-xs">Accent badge</Label>
                                                                        <Input
                                                                            value={slide.accent ?? ''}
                                                                            onChange={(e) => {
                                                                                const next = [...heroSlides]
                                                                                next[idx] = { ...next[idx], accent: e.target.value }
                                                                                setHeroSlides(next)
                                                                            }}
                                                                            placeholder="New Arrivals"
                                                                            className="h-8 rounded-none text-sm"
                                                                        />
                                                                    </div>
                                                                    <div className="grid gap-1.5">
                                                                        <Label className="text-xs">Button text</Label>
                                                                        <Input
                                                                            value={slide.buttonText ?? ''}
                                                                            onChange={(e) => {
                                                                                const next = [...heroSlides]
                                                                                next[idx] = { ...next[idx], buttonText: e.target.value }
                                                                                setHeroSlides(next)
                                                                            }}
                                                                            placeholder="Shop now"
                                                                            className="h-8 rounded-none text-sm"
                                                                        />
                                                                    </div>
                                                                </div>

                                                                <div className="grid gap-1.5">
                                                                    <Label className="text-xs">Slide image</Label>
                                                                    <ImageUpload
                                                                        value={slide.image ?? ''}
                                                                        pathInDb={slide.imagePath ?? ''}
                                                                        onChange={(url, path) => {
                                                                            const next = [...heroSlides]
                                                                            next[idx] = { ...next[idx], image: url, imagePath: path }
                                                                            setHeroSlides(next)
                                                                        }}
                                                                        bucket="store-assets"
                                                                        pathPrefix={`${store.id}/slides/${idx}`}
                                                                        aspectRatio="wide"
                                                                    />
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* ── DOMAIN ───────────────────────────────────────── */}
                                {activeTab === 'domain' && (
                                    <DomainSettings storeId={store.id} currentDomain={store.custom_domain} />
                                )}

                                {/* ── SOCIAL ───────────────────────────────────────── */}
                                {activeTab === 'social' && (
                                    <>
                                        <div>
                                            <h2 className="text-base font-semibold mb-1">Social Links</h2>
                                            <p className="text-sm text-muted-foreground">Show up where your audience already is</p>
                                        </div>
                                        <div className="space-y-4">
                                            {[
                                                { label: 'Instagram', placeholder: 'https://instagram.com/yourhandle', value: instagram, set: setInstagram },
                                                { label: 'TikTok', placeholder: 'https://tiktok.com/@yourhandle', value: tiktok, set: setTiktok },
                                                { label: 'Twitter / X', placeholder: 'https://x.com/yourhandle', value: twitter, set: setTwitter },
                                                { label: 'WhatsApp number', placeholder: '2547XXXXXXXX', value: whatsapp, set: setWhatsapp },
                                            ].map((field) => (
                                                <div key={field.label} className="grid gap-1.5">
                                                    <Label className="text-sm">{field.label}</Label>
                                                    <Input
                                                        value={field.value}
                                                        onChange={(e) => field.set(e.target.value)}
                                                        placeholder={field.placeholder}
                                                        className="h-9 rounded-none max-w-sm"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}

                                {activeTab === 'payments' && (
                                    <PaymentSettings storeId={store.id} />
                                )}

                                {/* ── NOTIFICATIONS ────────────────────────────────── */}
                                {activeTab === 'notifications' && (
                                    <>
                                        <div>
                                            <h2 className="text-base font-semibold mb-1">Notifications</h2>
                                            <p className="text-sm text-muted-foreground">Get notified when orders come in via WhatsApp</p>
                                        </div>
                                        <ProGate feature="WhatsApp order notifications" />
                                    </>
                                )}

                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            <SaveBar saving={saving} saved={saved} />
        </div>
    )
}
