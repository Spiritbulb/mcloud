'use client'

import { useState, useEffect } from 'react'
import { Check, ExternalLink, ChevronDown, Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SettingsSection, SettingsField } from '../../app/store/[slug]/settings/settings-primitives'
import ImageUpload from './image-upload'
import { THEMES } from '../../src/themes'

// shadcn primitives
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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
        themeId?: string
        heroTitle?: string
        heroSubtitle?: string
        heroImage?: string
        logoPath?: string
        heroSlides?: HeroSlide[]
        heroImagePath?: string
        socialLinks?: Record<string, string>
    }
    theme?: Record<string, string>
}

export interface AppearanceSettingsProps {
    store: StoreData
    themeId: string; setThemeId: (v: string) => void
    heroTitle: string; setHeroTitle: (v: string) => void
    heroSubtitle: string; setHeroSubtitle: (v: string) => void
    heroImage: string; setHeroImage: (v: string) => void
    logoUrl: string; setLogoUrl: (v: string) => void
    logoPath: string; setLogoPath: (v: string) => void
    heroSlides: HeroSlide[]; setHeroSlides: (v: HeroSlide[]) => void
    heroImagePath: string; setHeroImagePath: (v: string) => void
    primaryColor: string; setPrimaryColor: (v: string) => void
    secondaryColor: string; setSecondaryColor: (v: string) => void
    accentColor: string; setAccentColor: (v: string) => void
    bgColor: string; setBgColor: (v: string) => void
    fgColor: string; setFgColor: (v: string) => void
    mutedColor: string; setMutedColor: (v: string) => void
    darkPrimaryColor: string; setDarkPrimaryColor: (v: string) => void
    darkBgColor: string; setDarkBgColor: (v: string) => void
    darkFgColor: string; setDarkFgColor: (v: string) => void
    darkMutedColor: string; setDarkMutedColor: (v: string) => void
    headingFont: string; setHeadingFont: (v: string) => void
    bodyFont: string; setBodyFont: (v: string) => void
    borderRadius: string; setBorderRadius: (v: string) => void
}

// ─── Font catalogues (separated by role) ─────────────────────────────────────
// Heading fonts: display/serif/characterful — meant for short, prominent text
// Body fonts: high-legibility at small sizes — never a display font here

const HEADING_FONTS = [
    { value: 'Playfair Display', category: 'Serif' },
    { value: 'Cormorant Garamond', category: 'Serif' },
    { value: 'DM Serif Display', category: 'Serif' },
    { value: 'Libre Baskerville', category: 'Serif' },
    { value: 'Lora', category: 'Serif' },
    { value: 'Montserrat', category: 'Sans-serif' },
    { value: 'Raleway', category: 'Sans-serif' },
    { value: 'Josefin Sans', category: 'Sans-serif' },
]

const BODY_FONTS = [
    { value: 'Inter', category: 'Sans-serif' },
    { value: 'DM Sans', category: 'Sans-serif' },
    { value: 'Lato', category: 'Sans-serif' },
    { value: 'Nunito', category: 'Sans-serif' },
    { value: 'Source Sans 3', category: 'Sans-serif' },
    { value: 'Mulish', category: 'Sans-serif' },
    { value: 'Merriweather', category: 'Serif' },
    { value: 'Lora', category: 'Serif' },
]

const BORDER_RADII = [
    { label: 'Sharp', value: '0px' },
    { label: 'Slight', value: '4px' },
    { label: 'Rounded', value: '8px' },
    { label: 'Pill', value: '999px' },
]

// ─── Google Fonts loader ──────────────────────────────────────────────────────
// Dynamically injects a <link> for any Google Font not yet loaded.
// Deduplicates by element id — safe to call on every render.

function useGoogleFont(fontName: string) {
    useEffect(() => {
        if (!fontName) return
        const id = `gfont-${fontName.replace(/\s+/g, '-').toLowerCase()}`
        if (document.getElementById(id)) return
        const link = document.createElement('link')
        link.id = id
        link.rel = 'stylesheet'
        link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName).replace(/%20/g, '+')}:wght@400;600;700&display=swap`
        document.head.appendChild(link)
    }, [fontName])
}

// ─── ColorRow ─────────────────────────────────────────────────────────────────

function ColorRow({ label, value, onChange }: {
    label: string
    value: string
    onChange: (v: string) => void
}) {
    return (
        <div className="flex items-center gap-3">
            <span className="text-[12px] text-on-surface-muted w-24 shrink-0">{label}</span>
            <div className="flex items-center gap-2 flex-1">
                <label className="relative w-8 h-8 sm:w-7 sm:h-7 shrink-0 border border-light cursor-pointer overflow-hidden rounded-none">
                    <div className="absolute inset-0" style={{ backgroundColor: value }} />
                    <input
                        type="color"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    />
                </label>
                <Input
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    spellCheck={false}
                    className="font-mono text-[12px] h-8 flex-1 rounded-none"
                />
            </div>
        </div>
    )
}

// ─── ThemeSection ─────────────────────────────────────────────────────────────

function ThemeSection({ themeId, setThemeId, slug }: {
    themeId: string
    setThemeId: (v: string) => void
    slug: string
}) {
    return (
        <SettingsSection
            title="Theme"
            description="Layout and visual style of your storefront"
            aside={
                <a
                    href={`/store/${slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[12px] text-on-surface-muted hover:text-foreground transition-colors py-1"
                >
                    View store <ExternalLink className="w-3 h-3" />
                </a>
            }
        >
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                {THEMES.map((theme) => {
                    const isActive = themeId === theme.id
                    return (
                        <button
                            key={theme.id}
                            onClick={() => setThemeId(theme.id)}
                            className={cn(
                                'text-left border p-2.5 sm:p-3 transition-colors',
                                isActive
                                    ? 'border-foreground bg-surface-variant'
                                    : 'border-outline hover:border-outline-strong hover:bg-surface-variant/40'
                            )}
                        >
                            <div className="flex overflow-hidden border border-light mb-2 sm:mb-3 h-6 sm:h-7">
                                <div className="flex-1" style={{ backgroundColor: theme.preview.background }} />
                                <div className="flex-1" style={{ backgroundColor: theme.preview.primary }} />
                                <div className="w-3 sm:w-4" style={{ backgroundColor: theme.preview.accent }} />
                            </div>
                            <div className="flex items-start justify-between gap-1">
                                <div className="min-w-0">
                                    <p className="text-[12px] sm:text-[13px] font-medium text-foreground leading-none truncate">
                                        {theme.name}
                                    </p>
                                    <p className="hidden sm:block text-[11px] text-on-surface-muted mt-1 leading-snug">
                                        {theme.description}
                                    </p>
                                </div>
                                {isActive && (
                                    <div className="shrink-0 w-4 h-4 bg-foreground flex items-center justify-center">
                                        <Check className="w-2.5 h-2.5 text-surface" />
                                    </div>
                                )}
                            </div>
                        </button>
                    )
                })}
            </div>
        </SettingsSection>
    )
}

// ─── HeroSection ──────────────────────────────────────────────────────────────

function HeroSection(props: Pick<AppearanceSettingsProps,
    | 'store'
    | 'heroTitle' | 'setHeroTitle'
    | 'heroSubtitle' | 'setHeroSubtitle'
    | 'heroImage' | 'setHeroImage'
    | 'heroImagePath' | 'setHeroImagePath'
    | 'logoUrl' | 'setLogoUrl'
    | 'logoPath' | 'setLogoPath'
>) {
    const { store } = props
    return (
        <SettingsSection title="Hero & Logo" description="The first thing customers see on your storefront">
            <div className="mb-5 sm:mb-6">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-on-surface-muted mb-3">Logo</p>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                    <div className="w-full sm:w-20 h-16 sm:h-16 flex items-center justify-center border border-outline bg-surface shrink-0">
                        {props.logoUrl
                            ? <img src={props.logoUrl} alt="Logo" className="max-h-12 max-w-full object-contain" />
                            : <span className="text-[11px] text-on-surface-muted uppercase tracking-widest opacity-40">
                                {store.name.slice(0, 2)}
                            </span>
                        }
                    </div>
                    <div className="flex-1">
                        <ImageUpload
                            label="Upload logo"
                            value={props.logoUrl}
                            pathInDb={props.logoPath}
                            onChange={(url, path) => { props.setLogoUrl(url); props.setLogoPath(path) }}
                            bucket="store-assets"
                            pathPrefix={`${store.id}/logo`}
                            aspectRatio="square"
                        />
                    </div>
                </div>
            </div>

            <div className="h-px bg-outline mb-5 sm:mb-6" />

            <p className="text-[11px] font-semibold uppercase tracking-widest text-on-surface-muted mb-3">Banner</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-x-8 sm:gap-y-4">
                <div className="space-y-1.5">
                    <Label className="text-[12px] text-on-surface-muted">Title</Label>
                    <Input value={props.heroTitle} onChange={(e) => props.setHeroTitle(e.target.value)} placeholder={store.name} className="rounded-none" />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-[12px] text-on-surface-muted">Subtitle</Label>
                    <Input value={props.heroSubtitle} onChange={(e) => props.setHeroSubtitle(e.target.value)} placeholder="Free shipping on all orders" className="rounded-none" />
                </div>
                <div className="sm:col-span-2">
                    <SettingsField label="Hero image" hint="Used as the hero background">
                        <ImageUpload
                            label="Upload image"
                            value={props.heroImage}
                            pathInDb={props.heroImagePath}
                            onChange={(url, path) => { props.setHeroImage(url); props.setHeroImagePath(path) }}
                            bucket="store-assets"
                            pathPrefix={`${store.id}/hero`}
                            aspectRatio="wide"
                        />
                    </SettingsField>
                </div>
            </div>
        </SettingsSection>
    )
}

// ─── TypographySection ────────────────────────────────────────────────────────

function TypographySection(props: Pick<AppearanceSettingsProps,
    | 'headingFont' | 'setHeadingFont'
    | 'bodyFont' | 'setBodyFont'
    | 'borderRadius' | 'setBorderRadius'
>) {
    // Inject both fonts into the document so the preview actually renders them
    useGoogleFont(props.headingFont)
    useGoogleFont(props.bodyFont)

    return (
        <SettingsSection title="Typography & Shape">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-x-8">

                {/* ── Heading font picker ── */}
                <div className="space-y-1.5">
                    <Label className="text-[12px] text-on-surface-muted">Heading font</Label>
                    <Select value={props.headingFont} onValueChange={props.setHeadingFont}>
                        <SelectTrigger className="rounded-none text-base sm:text-[13px]">
                            <SelectValue placeholder="Pick a heading font" />
                        </SelectTrigger>
                        <SelectContent>
                            {HEADING_FONTS.map((f) => (
                                <SelectItem key={f.value} value={f.value}>
                                    <div className="flex items-center justify-between gap-8 w-full">
                                        <span>{f.value}</span>
                                        <span className="text-[11px] text-muted-foreground">{f.category}</span>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {/* Inline preview — renders in the chosen font */}
                    <div className="px-3 py-2 bg-surface border border-outline">
                        <p
                            className="text-[18px] leading-snug text-foreground"
                            style={{ fontFamily: `'${props.headingFont}', serif`, fontWeight: 700 }}
                        >
                            The quick brown fox
                        </p>
                        <p className="text-[10px] text-on-surface-muted mt-1 uppercase tracking-widest">
                            {props.headingFont}
                        </p>
                    </div>
                </div>

                {/* ── Body font picker ── */}
                <div className="space-y-1.5">
                    <Label className="text-[12px] text-on-surface-muted">Body font</Label>
                    <Select value={props.bodyFont} onValueChange={props.setBodyFont}>
                        <SelectTrigger className="rounded-none text-base sm:text-[13px]">
                            <SelectValue placeholder="Pick a body font" />
                        </SelectTrigger>
                        <SelectContent>
                            {BODY_FONTS.map((f) => (
                                <SelectItem key={f.value} value={f.value}>
                                    <div className="flex items-center justify-between gap-8 w-full">
                                        <span>{f.value}</span>
                                        <span className="text-[11px] text-muted-foreground">{f.category}</span>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {/* Inline preview */}
                    <div className="px-3 py-2 bg-surface border border-outline">
                        <p
                            className="text-[13px] leading-relaxed text-foreground"
                            style={{ fontFamily: `'${props.bodyFont}', sans-serif` }}
                        >
                            Handpicked styles for every occasion. Free shipping on orders over KES 2,000.
                        </p>
                        <p className="text-[10px] text-on-surface-muted mt-1 uppercase tracking-widest">
                            {props.bodyFont}
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Combined pairing preview ─────────────────────────────────── */}
            {/* Shows both fonts in context together — product card mockup */}
            <div className="mt-5 border border-outline overflow-hidden">
                {/* Header strip */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-surface border-b border-outline">
                    <p
                        className="text-[14px] font-semibold leading-none"
                        style={{ fontFamily: `'${props.headingFont}', serif`, fontWeight: 700 }}
                    >
                        Your Store
                    </p>
                    <p
                        className="text-[11px] text-on-surface-muted"
                        style={{ fontFamily: `'${props.bodyFont}', sans-serif` }}
                    >
                        Cart (2)
                    </p>
                </div>

                {/* Hero strip */}
                <div className="px-4 pt-4 pb-3 bg-background border-b border-outline">
                    <p
                        className="text-[20px] sm:text-[24px] leading-tight"
                        style={{ fontFamily: `'${props.headingFont}', serif`, fontWeight: 700 }}
                    >
                        Fresh Arrivals
                    </p>
                    <p
                        className="text-[12px] sm:text-[13px] mt-1 text-on-surface-muted"
                        style={{ fontFamily: `'${props.bodyFont}', sans-serif` }}
                    >
                        Handpicked styles for the season.
                    </p>
                </div>

                {/* Product row */}
                <div className="flex gap-3 px-4 py-3 bg-background">
                    {['Linen Tote', 'Canvas Cap', 'Woven Wrap'].map((name) => (
                        <div key={name} className="flex-1 min-w-0">
                            <div className="w-full aspect-square bg-surface mb-1.5" />
                            <p
                                className="text-[12px] font-semibold leading-tight truncate"
                                style={{ fontFamily: `'${props.headingFont}', serif` }}
                            >
                                {name}
                            </p>
                            <p
                                className="text-[11px] text-on-surface-muted mt-0.5"
                                style={{ fontFamily: `'${props.bodyFont}', sans-serif` }}
                            >
                                KES 1,800
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Border radius ── */}
            <div className="mt-5 sm:mt-6">
                <Label className="text-[12px] text-on-surface-muted mb-2 block">Button & card radius</Label>
                <div className="flex gap-2 flex-wrap">
                    {BORDER_RADII.map((r) => (
                        <button
                            key={r.value}
                            onClick={() => props.setBorderRadius(r.value)}
                            className={cn(
                                'h-9 sm:h-8 px-4 text-[12px] border transition-colors',
                                props.borderRadius === r.value
                                    ? 'bg-foreground text-surface border-foreground'
                                    : 'bg-background text-on-surface-muted border-light hover:border-outline-strong hover:text-foreground'
                            )}
                        >
                            {r.label}
                        </button>
                    ))}
                </div>
            </div>
        </SettingsSection>
    )
}

// ─── ColorsSection ────────────────────────────────────────────────────────────

function ColorsSection(props: Pick<AppearanceSettingsProps,
    | 'primaryColor' | 'setPrimaryColor'
    | 'secondaryColor' | 'setSecondaryColor'
    | 'accentColor' | 'setAccentColor'
    | 'bgColor' | 'setBgColor'
    | 'fgColor' | 'setFgColor'
    | 'mutedColor' | 'setMutedColor'
    | 'darkPrimaryColor' | 'setDarkPrimaryColor'
    | 'darkBgColor' | 'setDarkBgColor'
    | 'darkFgColor' | 'setDarkFgColor'
    | 'darkMutedColor' | 'setDarkMutedColor'
>) {
    const [mode, setMode] = useState<'light' | 'dark'>('light')

    return (
        <SettingsSection
            title="Colors"
            description="Fine-tune the palette — overrides the preset theme"
            aside={
                <div className="flex items-center border border-outline">
                    <button
                        onClick={() => setMode('light')}
                        className={cn(
                            'flex items-center gap-1.5 px-2.5 h-8 sm:h-7 text-[12px] transition-colors',
                            mode === 'light'
                                ? 'bg-surface-variant text-foreground'
                                : 'text-on-surface-muted hover:text-foreground'
                        )}
                    >
                        <Sun className="w-3 h-3" /> Light
                    </button>
                    <div className="w-px h-4 bg-outline" />
                    <button
                        onClick={() => setMode('dark')}
                        className={cn(
                            'flex items-center gap-1.5 px-2.5 h-8 sm:h-7 text-[12px] transition-colors',
                            mode === 'dark'
                                ? 'bg-surface-variant text-foreground'
                                : 'text-on-surface-muted hover:text-foreground'
                        )}
                    >
                        <Moon className="w-3 h-3" /> Dark
                    </button>
                </div>
            }
        >
            {mode === 'light' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-x-8 sm:gap-y-3">
                    <ColorRow label="Primary" value={props.primaryColor} onChange={props.setPrimaryColor} />
                    <ColorRow label="Secondary" value={props.secondaryColor} onChange={props.setSecondaryColor} />
                    <ColorRow label="Accent" value={props.accentColor} onChange={props.setAccentColor} />
                    <ColorRow label="Background" value={props.bgColor} onChange={props.setBgColor} />
                    <ColorRow label="Foreground" value={props.fgColor} onChange={props.setFgColor} />
                    <ColorRow label="Muted" value={props.mutedColor} onChange={props.setMutedColor} />
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-x-8 sm:gap-y-3">
                    <ColorRow label="Primary" value={props.darkPrimaryColor} onChange={props.setDarkPrimaryColor} />
                    <ColorRow label="Background" value={props.darkBgColor} onChange={props.setDarkBgColor} />
                    <ColorRow label="Foreground" value={props.darkFgColor} onChange={props.setDarkFgColor} />
                    <ColorRow label="Muted" value={props.darkMutedColor} onChange={props.setDarkMutedColor} />
                </div>
            )}
        </SettingsSection>
    )
}

// ─── SlidesSection + SlideCard ────────────────────────────────────────────────

function SlideCard({ slide, idx, total, storeId, onChange, onMove, onRemove }: {
    slide: HeroSlide
    idx: number
    total: number
    storeId: string
    onChange: (v: HeroSlide) => void
    onMove: (dir: 'up' | 'down') => void
    onRemove: () => void
}) {
    const [open, setOpen] = useState(true)

    return (
        <div className="border border-outline">
            <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 border-b border-outline bg-surface-variant/30">
                <button
                    onClick={() => setOpen(!open)}
                    className="flex items-center gap-2 text-[12px] font-medium text-foreground min-w-0"
                >
                    <ChevronDown className={cn('w-3.5 h-3.5 text-on-surface-muted transition-transform shrink-0', open && 'rotate-180')} />
                    <span className="shrink-0">Slide {idx + 1}</span>
                    {slide.title && (
                        <span className="text-on-surface-muted font-normal truncate">— {slide.title}</span>
                    )}
                </button>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                    {(['up', 'down'] as const).map((dir) => (
                        <button
                            key={dir}
                            disabled={dir === 'up' ? idx === 0 : idx === total - 1}
                            onClick={() => onMove(dir)}
                            className="w-8 h-8 sm:w-6 sm:h-6 flex items-center justify-center text-[11px] border border-outline text-on-surface-muted hover:text-foreground disabled:opacity-30 transition-colors"
                        >{dir === 'up' ? '↑' : '↓'}</button>
                    ))}
                    <button
                        onClick={onRemove}
                        className="w-8 h-8 sm:w-6 sm:h-6 flex items-center justify-center text-[11px] border border-outline text-on-surface-muted hover:text-red-500 transition-colors"
                    >×</button>
                </div>
            </div>

            {open && (
                <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-x-6 sm:gap-y-4">
                        {([
                            { label: 'Title', field: 'title', placeholder: 'Your statement' },
                            { label: 'Subtitle', field: 'subtitle', placeholder: 'Discover our bestsellers…' },
                            { label: 'Accent badge', field: 'accent', placeholder: 'New Arrivals' },
                            { label: 'Button text', field: 'buttonText', placeholder: 'Shop now' },
                        ] as const).map(({ label, field, placeholder }) => (
                            <div key={field} className="space-y-1.5">
                                <Label className="text-[12px] text-on-surface-muted">{label}</Label>
                                <Input
                                    value={(slide as any)[field] ?? ''}
                                    onChange={(e) => onChange({ ...slide, [field]: e.target.value })}
                                    placeholder={placeholder}
                                    className="rounded-none"
                                />
                            </div>
                        ))}
                    </div>
                    <SettingsField label="Slide image">
                        <ImageUpload
                            value={slide.image ?? ''}
                            pathInDb={slide.imagePath ?? ''}
                            onChange={(url, path) => onChange({ ...slide, image: url, imagePath: path })}
                            bucket="store-assets"
                            pathPrefix={`${storeId}/slides/${idx}`}
                            aspectRatio="wide"
                        />
                    </SettingsField>
                </div>
            )}
        </div>
    )
}

function SlidesSection(props: Pick<AppearanceSettingsProps, 'store' | 'heroSlides' | 'setHeroSlides'>) {
    const { store, heroSlides, setHeroSlides } = props
    return (
        <SettingsSection
            title="Hero slides"
            description="Multiple slides replace the single hero. Leave empty to use the image above."
            aside={
                <button
                    onClick={() => setHeroSlides([...heroSlides, { title: '', subtitle: '', accent: 'New Arrivals', buttonText: 'Shop now' }])}
                    className="btn-secondary h-8 sm:h-7 px-3 text-[12px]"
                >
                    + Add slide
                </button>
            }
        >
            {heroSlides.length === 0 ? (
                <p className="text-[12px] text-on-surface-muted py-1">
                    No slides — using hero image and title above.
                </p>
            ) : (
                <div className="space-y-3">
                    {heroSlides.map((slide, idx) => (
                        <SlideCard
                            key={idx}
                            slide={slide}
                            idx={idx}
                            total={heroSlides.length}
                            storeId={store.id}
                            onChange={(updated) => {
                                const next = [...heroSlides]
                                next[idx] = updated
                                setHeroSlides(next)
                            }}
                            onMove={(dir) => {
                                const next = [...heroSlides]
                                const swap = dir === 'up' ? idx - 1 : idx + 1
                                    ;[next[idx], next[swap]] = [next[swap], next[idx]]
                                setHeroSlides(next)
                            }}
                            onRemove={() => setHeroSlides(heroSlides.filter((_, i) => i !== idx))}
                        />
                    ))}
                </div>
            )}
        </SettingsSection>
    )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function AppearanceSettings(props: AppearanceSettingsProps) {
    return (
        <div className="space-y-4">
            <ThemeSection themeId={props.themeId} setThemeId={props.setThemeId} slug={props.store.slug} />
            <HeroSection
                store={props.store}
                heroTitle={props.heroTitle} setHeroTitle={props.setHeroTitle}
                heroSubtitle={props.heroSubtitle} setHeroSubtitle={props.setHeroSubtitle}
                heroImage={props.heroImage} setHeroImage={props.setHeroImage}
                heroImagePath={props.heroImagePath} setHeroImagePath={props.setHeroImagePath}
                logoUrl={props.logoUrl} setLogoUrl={props.setLogoUrl}
                logoPath={props.logoPath} setLogoPath={props.setLogoPath}
            />
            <TypographySection
                headingFont={props.headingFont} setHeadingFont={props.setHeadingFont}
                bodyFont={props.bodyFont} setBodyFont={props.setBodyFont}
                borderRadius={props.borderRadius} setBorderRadius={props.setBorderRadius}
            />
            <ColorsSection
                primaryColor={props.primaryColor} setPrimaryColor={props.setPrimaryColor}
                secondaryColor={props.secondaryColor} setSecondaryColor={props.setSecondaryColor}
                accentColor={props.accentColor} setAccentColor={props.setAccentColor}
                bgColor={props.bgColor} setBgColor={props.setBgColor}
                fgColor={props.fgColor} setFgColor={props.setFgColor}
                mutedColor={props.mutedColor} setMutedColor={props.setMutedColor}
                darkPrimaryColor={props.darkPrimaryColor} setDarkPrimaryColor={props.setDarkPrimaryColor}
                darkBgColor={props.darkBgColor} setDarkBgColor={props.setDarkBgColor}
                darkFgColor={props.darkFgColor} setDarkFgColor={props.setDarkFgColor}
                darkMutedColor={props.darkMutedColor} setDarkMutedColor={props.setDarkMutedColor}
            />
            <SlidesSection store={props.store} heroSlides={props.heroSlides} setHeroSlides={props.setHeroSlides} />
        </div>
    )
}