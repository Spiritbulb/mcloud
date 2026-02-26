'use client'

import { useState } from 'react'
import { createClient } from '@/lib/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Check, Store, Palette, Globe, Link2, CreditCard, Bell } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import ImageUpload from './image-upload'

// ─── Types ────────────────────────────────────────────────────────────────────
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
        socialLinks?: {
            instagram?: string
            twitter?: string
            tiktok?: string
            whatsapp?: string
        }
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
    'Africa/Nairobi',
    'Africa/Lagos',
    'Africa/Johannesburg',
    'Africa/Cairo',
    'UTC',
    'Europe/London',
    'America/New_York',
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
                    <div className="bg-[#1c2228] text-white px-4 py-2.5 text-sm flex items-center gap-2">
                        {saving ? (
                            <>
                                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
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

    // Appearance
    const [primaryColor, setPrimaryColor] = useState(store.settings?.primaryColor ?? '#1c2228')
    const [heroTitle, setHeroTitle] = useState(store.settings?.heroTitle ?? '')
    const [heroSubtitle, setHeroSubtitle] = useState(store.settings?.heroSubtitle ?? '')
    const [heroImage, setHeroImage] = useState(store.settings?.heroImage ?? '')
    const [logoUrl, setLogoUrl] = useState(store.logo_url ?? '')

    // Social
    const [instagram, setInstagram] = useState(store.settings?.socialLinks?.instagram ?? '')
    const [tiktok, setTiktok] = useState(store.settings?.socialLinks?.tiktok ?? '')
    const [twitter, setTwitter] = useState(store.settings?.socialLinks?.twitter ?? '')
    const [whatsapp, setWhatsapp] = useState(store.settings?.socialLinks?.whatsapp ?? '')

    const handleSave = async () => {
        setSaving(true)
        const supabase = createClient()

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
                    primaryColor,
                    heroTitle: heroTitle || undefined,
                    heroSubtitle: heroSubtitle || undefined,
                    heroImage: heroImage || undefined,
                    socialLinks: {
                        instagram: instagram || undefined,
                        tiktok: tiktok || undefined,
                        twitter: twitter || undefined,
                        whatsapp: whatsapp || undefined,
                    },
                },
            })
            .eq('id', store.id)

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

                                        <div className="space-y-4">
                                            <div className="grid gap-1.5">
                                                <Label className="text-sm">Logo URL</Label>

                                                <ImageUpload
                                                    label="Store logo"
                                                    value={logoUrl}
                                                    onChange={setLogoUrl}
                                                    bucket="store-assets"
                                                    path={`${store.id}/logo`}
                                                    aspectRatio="square"
                                                />
                                                {logoUrl && (
                                                    <img src={logoUrl} alt="Logo preview" className="w-12 h-12 rounded-full object-cover mt-1" />
                                                )}
                                            </div>

                                            <div className="grid gap-1.5">
                                                <Label className="text-sm">Primary color</Label>
                                                <div className="flex items-center gap-3 max-w-sm">
                                                    <input
                                                        type="color"
                                                        value={primaryColor}
                                                        onChange={(e) => setPrimaryColor(e.target.value)}
                                                        className="w-9 h-9 border cursor-pointer bg-background p-0.5"
                                                    />
                                                    <Input
                                                        value={primaryColor}
                                                        onChange={(e) => setPrimaryColor(e.target.value)}
                                                        placeholder="#1c2228"
                                                        className="h-9 rounded-none font-mono"
                                                    />
                                                </div>
                                            </div>

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
                                                <Label className="text-sm">Hero image URL</Label>
                                                // And hero image:
                                                <ImageUpload
                                                    label="Hero image"
                                                    value={heroImage}
                                                    onChange={setHeroImage}
                                                    bucket="store-assets"
                                                    path={`${store.id}/hero`}
                                                    aspectRatio="wide"
                                                />
                                                <p className="text-xs text-muted-foreground">
                                                    Displayed as a background in your store hero section
                                                </p>
                                            </div>

                                            {/* Live preview pill */}
                                            <div className="max-w-sm border p-4 space-y-2">
                                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Preview</p>
                                                <div
                                                    className="h-16 flex items-center justify-center rounded-sm"
                                                    style={{ backgroundColor: primaryColor }}
                                                >
                                                    <span className="text-white font-semibold text-sm">
                                                        {heroTitle || store.name}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* ── DOMAIN ───────────────────────────────────────── */}
                                {activeTab === 'domain' && (
                                    <>
                                        <div>
                                            <h2 className="text-base font-semibold mb-1">Custom Domain</h2>
                                            <p className="text-sm text-muted-foreground">Connect your own domain to your store</p>
                                        </div>
                                        <ProGate feature="Custom domain" />
                                    </>
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

                                {/* ── PAYMENTS ─────────────────────────────────────── */}
                                {activeTab === 'payments' && (
                                    <>
                                        <div>
                                            <h2 className="text-base font-semibold mb-1">Payment Integrations</h2>
                                            <p className="text-sm text-muted-foreground">Connect payment providers to accept orders</p>
                                        </div>
                                        <ProGate feature="Payment integrations (M-Pesa, Stripe, PayPal)" />
                                    </>
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
