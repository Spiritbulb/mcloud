'use client'

import { useState, useEffect } from 'react'
import { Check, ExternalLink, ChevronDown, Moon, Sun } from 'lucide-react'
import { cn } from '@mcloud/ui/utils'
import { SettingsSection, SettingsField } from '@/app/(merchant)/org/[orgSlug]/[storeSlug]/settings/settings-primitives'
import ImageUpload from './image-upload'
import { THEMES } from '@mcloud/themes'

// shadcn primitives
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@mcloud/ui/select'
import { Input } from '@mcloud/ui/input'
import { Label } from '@mcloud/ui/label'

// ─── Types ────────────────────────────────────────────────────────────────────

interface HeroSlide {
    title: string
    subtitle?: string
    image?: string
    imagePath?: string
    accent?: string
    buttonText?: string
}

interface GalleryPhoto {
    id: string
    url: string
    path?: string
    caption?: string
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
        galleryPhotos?: GalleryPhoto[]
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
    galleryPhotos: GalleryPhoto[]; setGalleryPhotos: (v: GalleryPhoto[]) => void
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

function MSO({ icon, className, fill = 0 }: { icon: string; className?: string; fill?: number }) {
    return (
        <span
            className={cn('material-symbols-outlined select-none leading-none', className)}
            style={{ fontVariationSettings: `'FILL' ${fill}, 'wght' 400, 'GRAD' 0, 'opsz' 20` }}
        >
            {icon}
        </span>
    )
}

// ─── ColorRow ─────────────────────────────────────────────────────────────────

function ColorRow({ label, value, onChange }: {
    label: string
    value: string
    onChange: (v: string) => void
}) {
    return (
        <div className="flex items-center gap-3 group">
            <span className="text-[12px] text-on-surface-muted w-24 shrink-0">{label}</span>
            <label className="relative shrink-0 cursor-pointer">
                <div
                    className="w-8 h-8 rounded-lg border border-light shadow-sm transition-transform group-hover:scale-105"
                    style={{ backgroundColor: value }}
                />
                <input
                    type="color"
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                />
            </label>
            <input
                type="text"
                value={value}
                onChange={e => onChange(e.target.value)}
                spellCheck={false}
                className={cn(
                    'flex-1 h-8 px-2.5 font-mono text-[12px] rounded-lg',
                    'border border-light bg-surface text-foreground',
                    'focus:outline-none focus:border-foreground/40 focus:ring-2 focus:ring-foreground/10',
                    'transition-all duration-150'
                )}
            />
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
                    className="inline-flex items-center gap-1.5 text-[12px] text-on-surface-muted hover:text-foreground transition-colors"
                >
                    <MSO icon="open_in_new" className="text-[14px]" />
                    Preview store
                </a>
            }
        >
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {THEMES.map((theme) => {
                    const isActive = themeId === theme.id
                    return (
                        <button
                            key={theme.id}
                            onClick={() => setThemeId(theme.id)}
                            className={cn(
                                'group relative text-left rounded-xl border-2 p-3 transition-all duration-150 overflow-hidden',
                                isActive
                                    ? 'border-foreground shadow-md'
                                    : 'border-light hover:border-light-strong hover:shadow-sm'
                            )}
                        >
                            {/* Color swatch */}
                            <div className="flex gap-1 mb-3 rounded-md overflow-hidden h-8">
                                <div className="flex-1 rounded-l-md" style={{ backgroundColor: theme.preview.background }} />
                                <div className="flex-1" style={{ backgroundColor: theme.preview.primary }} />
                                <div className="w-5 rounded-r-md" style={{ backgroundColor: theme.preview.accent }} />
                            </div>

                            <p className="text-[12px] font-semibold text-foreground leading-none truncate">
                                {theme.name}
                            </p>
                            <p className="hidden sm:block text-[11px] text-on-surface-muted mt-1 leading-snug">
                                {theme.description}
                            </p>

                            {/* Active checkmark */}
                            {isActive && (
                                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-foreground flex items-center justify-center">
                                    <MSO icon="check" className="text-[13px] text-surface" fill={1} />
                                </div>
                            )}
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
        <SettingsSection title="Brand" description="Your logo and storefront banner">

            {/* Logo */}
            <div className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-on-surface-muted">Logo</p>
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl border border-light bg-surface flex items-center justify-center overflow-hidden shrink-0">
                        {props.logoUrl
                            ? <img src={props.logoUrl} alt="Logo" className="max-h-12 max-w-full object-contain" />
                            : <span className="text-[13px] font-bold text-on-surface-muted uppercase tracking-widest">
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
                        <p className="text-[11px] text-on-surface-muted mt-1.5">
                            Recommended: square PNG with transparent background
                        </p>
                    </div>
                </div>
            </div>

            <div className="h-px bg-light my-5" />

            {/* Banner */}
            <div className="space-y-4">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-on-surface-muted">Banner</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <label className="block text-[12px] text-on-surface-muted">Title</label>
                        <Input
                            value={props.heroTitle}
                            onChange={e => props.setHeroTitle(e.target.value)}
                            placeholder={store.name}
                            className="rounded-lg"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="block text-[12px] text-on-surface-muted">Subtitle</label>
                        <Input
                            value={props.heroSubtitle}
                            onChange={e => props.setHeroSubtitle(e.target.value)}
                            placeholder="Free shipping on all orders"
                            className="rounded-lg"
                        />
                    </div>
                </div>
                <div className="space-y-1.5">
                    <label className="block text-[12px] text-on-surface-muted">
                        Hero image
                        <span className="ml-1.5 text-[11px] text-on-surface-muted/60">— used as the banner background</span>
                    </label>
                    <ImageUpload
                        label="Upload image"
                        value={props.heroImage}
                        pathInDb={props.heroImagePath}
                        onChange={(url, path) => { props.setHeroImage(url); props.setHeroImagePath(path) }}
                        bucket="store-assets"
                        pathPrefix={`${store.id}/hero`}
                        aspectRatio="wide"
                    />
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
    useGoogleFont(props.headingFont)
    useGoogleFont(props.bodyFont)

    return (
        <SettingsSection title="Typography & Shape">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

                {/* Heading font */}
                <div className="space-y-2">
                    <label className="block text-[11px] font-semibold uppercase tracking-widest text-on-surface-muted">
                        Heading font
                    </label>
                    <Select value={props.headingFont} onValueChange={props.setHeadingFont}>
                        <SelectTrigger className="rounded-lg text-[13px]">
                            <SelectValue placeholder="Pick a heading font" />
                        </SelectTrigger>
                        <SelectContent>
                            {HEADING_FONTS.map(f => (
                                <SelectItem key={f.value} value={f.value}>
                                    <span>{f.value}</span>
                                    <span className="ml-2 text-[11px] text-muted-foreground">{f.category}</span>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <div className="px-3.5 py-3 bg-surface rounded-xl border border-light">
                        <p
                            className="text-[20px] leading-snug text-foreground"
                            style={{ fontFamily: `'${props.headingFont}', serif`, fontWeight: 700 }}
                        >
                            The quick brown fox
                        </p>
                        <p className="text-[10px] text-on-surface-muted mt-1.5 uppercase tracking-widest">
                            {props.headingFont}
                        </p>
                    </div>
                </div>

                {/* Body font */}
                <div className="space-y-2">
                    <label className="block text-[11px] font-semibold uppercase tracking-widest text-on-surface-muted">
                        Body font
                    </label>
                    <Select value={props.bodyFont} onValueChange={props.setBodyFont}>
                        <SelectTrigger className="rounded-lg text-[13px]">
                            <SelectValue placeholder="Pick a body font" />
                        </SelectTrigger>
                        <SelectContent>
                            {BODY_FONTS.map(f => (
                                <SelectItem key={f.value} value={f.value}>
                                    <span>{f.value}</span>
                                    <span className="ml-2 text-[11px] text-muted-foreground">{f.category}</span>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <div className="px-3.5 py-3 bg-surface rounded-xl border border-light">
                        <p
                            className="text-[13px] leading-relaxed text-foreground"
                            style={{ fontFamily: `'${props.bodyFont}', sans-serif` }}
                        >
                            Handpicked styles for every occasion. Free shipping on orders over KES 2,000.
                        </p>
                        <p className="text-[10px] text-on-surface-muted mt-1.5 uppercase tracking-widest">
                            {props.bodyFont}
                        </p>
                    </div>
                </div>
            </div>

            {/* Pairing preview */}
            <div className="mt-5 rounded-xl border border-light overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-surface border-b border-light">
                    <p className="text-[14px] font-semibold" style={{ fontFamily: `'${props.headingFont}', serif`, fontWeight: 700 }}>
                        Your Store
                    </p>
                    <p className="text-[11px] text-on-surface-muted" style={{ fontFamily: `'${props.bodyFont}', sans-serif` }}>
                        Cart (2)
                    </p>
                </div>
                <div className="px-4 pt-4 pb-3 border-b border-light bg-background">
                    <p className="text-[22px] leading-tight" style={{ fontFamily: `'${props.headingFont}', serif`, fontWeight: 700 }}>
                        Fresh Arrivals
                    </p>
                    <p className="text-[12px] mt-1 text-on-surface-muted" style={{ fontFamily: `'${props.bodyFont}', sans-serif` }}>
                        Handpicked styles for the season.
                    </p>
                </div>
                <div className="flex gap-3 px-4 py-3 bg-background">
                    {['Linen Tote', 'Canvas Cap', 'Woven Wrap'].map(name => (
                        <div key={name} className="flex-1 min-w-0">
                            <div className="w-full aspect-square bg-surface rounded-lg mb-1.5" />
                            <p className="text-[12px] font-semibold leading-tight truncate" style={{ fontFamily: `'${props.headingFont}', serif` }}>
                                {name}
                            </p>
                            <p className="text-[11px] text-on-surface-muted mt-0.5" style={{ fontFamily: `'${props.bodyFont}', sans-serif` }}>
                                KES 1,800
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Border radius */}
            <div className="mt-5">
                <label className="block text-[11px] font-semibold uppercase tracking-widest text-on-surface-muted mb-3">
                    Button & card radius
                </label>
                <div className="flex gap-2 flex-wrap">
                    {BORDER_RADII.map(r => (
                        <button
                            key={r.value}
                            onClick={() => props.setBorderRadius(r.value)}
                            className={cn(
                                'h-9 px-4 text-[12px] font-medium border transition-all duration-150',
                                'rounded-lg',          // the tab itself is always rounded
                                props.borderRadius === r.value
                                    ? 'bg-foreground text-surface border-foreground'
                                    : 'bg-background text-on-surface-muted border-light hover:border-light-strong hover:text-foreground'
                            )}
                            style={{ borderRadius: r.value === '0px' ? '4px' : r.value }}  // preview the radius on the button itself
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
                <div className="flex items-center rounded-lg border border-light overflow-hidden text-[12px]">
                    {(['light', 'dark'] as const).map((m) => (
                        <button
                            key={m}
                            onClick={() => setMode(m)}
                            className={cn(
                                'flex items-center gap-1.5 px-3 h-7 transition-colors capitalize',
                                mode === m
                                    ? 'bg-foreground text-surface font-medium'
                                    : 'text-on-surface-muted hover:text-foreground'
                            )}
                        >
                            <MSO icon={m === 'light' ? 'light_mode' : 'dark_mode'} className="text-[14px]" fill={mode === m ? 1 : 0} />
                            {m}
                        </button>
                    ))}
                </div>
            }
        >
            {mode === 'light' ? (
                <div className="space-y-4">
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-on-surface-muted mb-3">Brand</p>
                        <div className="space-y-2.5">
                            <ColorRow label="Primary" value={props.primaryColor} onChange={props.setPrimaryColor} />
                            <ColorRow label="Secondary" value={props.secondaryColor} onChange={props.setSecondaryColor} />
                            <ColorRow label="Accent" value={props.accentColor} onChange={props.setAccentColor} />
                        </div>
                    </div>
                    <div className="h-px bg-light" />
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-on-surface-muted mb-3">Surface</p>
                        <div className="space-y-2.5">
                            <ColorRow label="Background" value={props.bgColor} onChange={props.setBgColor} />
                            <ColorRow label="Foreground" value={props.fgColor} onChange={props.setFgColor} />
                            <ColorRow label="Muted" value={props.mutedColor} onChange={props.setMutedColor} />
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-2.5">
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
    const [open, setOpen] = useState(idx === 0)

    return (
        <div className="rounded-xl border border-light overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-surface-variant/40">
                <button
                    onClick={() => setOpen(!open)}
                    className="flex items-center gap-2.5 text-[13px] font-medium text-foreground min-w-0"
                >
                    <MSO icon={open ? 'expand_less' : 'expand_more'} className="text-[18px] text-on-surface-muted shrink-0" />
                    <span className="shrink-0 text-on-surface-muted text-[12px]">#{idx + 1}</span>
                    <span className="truncate">
                        {slide.title || <span className="text-on-surface-muted font-normal italic">Untitled slide</span>}
                    </span>
                </button>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                    <button
                        disabled={idx === 0}
                        onClick={() => onMove('up')}
                        title="Move up"
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface-muted hover:text-foreground hover:bg-surface disabled:opacity-25 transition-colors"
                    >
                        <MSO icon="arrow_upward" className="text-[15px]" />
                    </button>
                    <button
                        disabled={idx === total - 1}
                        onClick={() => onMove('down')}
                        title="Move down"
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface-muted hover:text-foreground hover:bg-surface disabled:opacity-25 transition-colors"
                    >
                        <MSO icon="arrow_downward" className="text-[15px]" />
                    </button>
                    <button
                        onClick={onRemove}
                        title="Remove slide"
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    >
                        <MSO icon="delete" className="text-[15px]" />
                    </button>
                </div>
            </div>

            {/* Body */}
            {open && (
                <div className="p-4 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {([
                            { label: 'Title', field: 'title', placeholder: 'Your statement' },
                            { label: 'Subtitle', field: 'subtitle', placeholder: 'Discover our bestsellers…' },
                            { label: 'Accent badge', field: 'accent', placeholder: 'New Arrivals' },
                            { label: 'Button text', field: 'buttonText', placeholder: 'Shop now' },
                        ] as const).map(({ label, field, placeholder }) => (
                            <div key={field} className="space-y-1.5">
                                <label className="block text-[12px] text-on-surface-muted">{label}</label>
                                <Input
                                    value={(slide as any)[field] ?? ''}
                                    onChange={e => onChange({ ...slide, [field]: e.target.value })}
                                    placeholder={placeholder}
                                    className="rounded-lg"
                                />
                            </div>
                        ))}
                    </div>
                    <div className="space-y-1.5">
                        <label className="block text-[12px] text-on-surface-muted">Slide image</label>
                        <ImageUpload
                            value={slide.image ?? ''}
                            pathInDb={slide.imagePath ?? ''}
                            onChange={(url, path) => onChange({ ...slide, image: url, imagePath: path })}
                            bucket="store-assets"
                            pathPrefix={`${storeId}/slides/${idx}`}
                            aspectRatio="wide"
                        />
                    </div>
                </div>
            )}
        </div>
    )
}

function SlidesSection(props: Pick<AppearanceSettingsProps, 'store' | 'heroSlides' | 'setHeroSlides'>) {
    const { store, heroSlides, setHeroSlides } = props

    return (
        <SettingsSection
            title="Hero Slides"
            description="Multiple slides replace the single banner image. Leave empty to use the hero image above."
            aside={
                <button
                    onClick={() => setHeroSlides([...heroSlides, { title: '', subtitle: '', accent: 'New Arrivals', buttonText: 'Shop now' }])}
                    className={cn(
                        'flex items-center gap-1.5 h-8 px-3 rounded-lg border border-light',
                        'text-[12px] text-on-surface-muted hover:text-foreground hover:border-light-strong',
                        'transition-colors'
                    )}
                >
                    <MSO icon="add" className="text-[16px]" />
                    Add slide
                </button>
            }
        >
            {heroSlides.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-8 rounded-xl border border-dashed border-light text-center">
                    <MSO icon="view_carousel" className="text-[32px] text-on-surface-muted/30" />
                    <p className="text-[13px] font-medium text-on-surface-muted">No slides yet</p>
                    <p className="text-[12px] text-on-surface-muted/60 max-w-[220px]">
                        Add slides to create a rotating hero carousel on your storefront.
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    {heroSlides.map((slide, idx) => (
                        <SlideCard
                            key={idx}
                            slide={slide}
                            idx={idx}
                            total={heroSlides.length}
                            storeId={store.id}
                            onChange={updated => {
                                const next = [...heroSlides]; next[idx] = updated; setHeroSlides(next)
                            }}
                            onMove={dir => {
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

// ─── GallerySection ─────────────────────────────────────────────────────────────

function GalleryPhotoCard({ photo, idx, onChange, onRemove }: {
    photo: GalleryPhoto
    idx: number
    onChange: (photo: GalleryPhoto) => void
    onRemove: () => void
}) {
    const [open, setOpen] = useState(false)

    return (
        <div className="rounded-xl border border-light overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-surface-variant/40">
                <button
                    onClick={() => setOpen(!open)}
                    className="flex items-center gap-2.5 text-[13px] font-medium text-foreground min-w-0"
                >
                    {photo.url
                        ? <img src={photo.url} alt="" className="w-6 h-6 rounded object-cover shrink-0 border border-light" />
                        : <div className="w-6 h-6 rounded bg-surface border border-light shrink-0 flex items-center justify-center">
                            <MSO icon="image" className="text-[13px] text-on-surface-muted" />
                        </div>
                    }
                    <span className="shrink-0 text-on-surface-muted text-[12px]">#{idx + 1}</span>
                    <span className="truncate">
                        {photo.caption || <span className="text-on-surface-muted font-normal italic">No caption</span>}
                    </span>
                </button>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                    <button
                        onClick={() => setOpen(!open)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface-muted hover:text-foreground hover:bg-surface transition-colors"
                    >
                        <MSO icon={open ? 'expand_less' : 'edit'} className="text-[15px]" />
                    </button>
                    <button
                        onClick={onRemove}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    >
                        <MSO icon="delete" className="text-[15px]" />
                    </button>
                </div>
            </div>

            {open && (
                <div className="p-4 space-y-3">
                    <ImageUpload
                        value={photo.url ?? ''}
                        pathInDb={photo.path ?? ''}
                        onChange={(url, path) => onChange({ ...photo, url, path })}
                        bucket="store-assets"
                        pathPrefix={`__storeId__/gallery/${idx}`}
                        aspectRatio="square"
                    />
                    <div className="space-y-1.5">
                        <label className="block text-[12px] text-on-surface-muted">Caption</label>
                        <Input
                            value={photo.caption ?? ''}
                            onChange={e => onChange({ ...photo, caption: e.target.value })}
                            placeholder="Optional caption"
                            className="rounded-lg"
                        />
                    </div>
                </div>
            )}
        </div>
    )
}

function GallerySection(props: Pick<AppearanceSettingsProps, 'store' | 'galleryPhotos' | 'setGalleryPhotos'>) {
    const { store, galleryPhotos, setGalleryPhotos } = props

    return (
        <SettingsSection
            title="Photo Gallery"
            description="Displayed on the Photography theme homepage. Leave empty to show all products instead."
            aside={
                <button
                    onClick={() => setGalleryPhotos([...galleryPhotos, { id: crypto.randomUUID(), url: '', caption: '' }])}
                    className={cn(
                        'flex items-center gap-1.5 h-8 px-3 rounded-lg border border-light',
                        'text-[12px] text-on-surface-muted hover:text-foreground hover:border-light-strong',
                        'transition-colors'
                    )}
                >
                    <MSO icon="add_photo_alternate" className="text-[16px]" />
                    Add photo
                </button>
            }
        >
            {galleryPhotos.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-8 rounded-xl border border-dashed border-light text-center">
                    <MSO icon="photo_library" className="text-[32px] text-on-surface-muted/30" />
                    <p className="text-[13px] font-medium text-on-surface-muted">No photos yet</p>
                    <p className="text-[12px] text-on-surface-muted/60 max-w-[220px]">
                        Photos appear in the gallery grid on your storefront homepage.
                    </p>
                </div>
            ) : (
                <>
                    {/* Live grid preview — always visible */}
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 mb-4">
                        {galleryPhotos.map((photo, i) => (
                            <div key={photo.id} className="aspect-square rounded-lg bg-surface border border-light overflow-hidden">
                                {photo.url
                                    ? <img src={photo.url} alt={photo.caption ?? ''} className="w-full h-full object-cover" />
                                    : <div className="w-full h-full flex items-center justify-center">
                                        <MSO icon="image" className="text-[18px] text-on-surface-muted/30" />
                                    </div>
                                }
                            </div>
                        ))}
                    </div>

                    <div className="space-y-2">
                        {galleryPhotos.map((photo, idx) => (
                            <GalleryPhotoCard
                                key={photo.id}
                                photo={photo}
                                idx={idx}
                                onChange={updated => {
                                    const next = [...galleryPhotos]; next[idx] = { ...updated, id: photo.id }; setGalleryPhotos(next)
                                }}
                                onRemove={() => setGalleryPhotos(galleryPhotos.filter((_, i) => i !== idx))}
                            />
                        ))}
                    </div>
                </>
            )}
        </SettingsSection>
    )
}

// ─── Tab config ───────────────────────────────────────────────────────────────

type TabId = 'theme' | 'brand' | 'styling' | 'components'

const APPEARANCE_TABS: { id: TabId; label: string; icon: string; description: string }[] = [
    { id: 'theme', label: 'Theme', icon: 'palette', description: 'Layout & visual style' },
    { id: 'brand', label: 'Brand', icon: 'storefront', description: 'Logo & identity' },
    { id: 'styling', label: 'Styling', icon: 'format_paint', description: 'Colors & typography' },
    { id: 'components', label: 'Components', icon: 'view_quilt', description: 'Hero, slides & gallery' },
]

// ─── Tab bar ──────────────────────────────────────────────────────────────────

function AppearanceTabBar({
    active,
    onChange,
}: {
    active: TabId
    onChange: (id: TabId) => void
}) {
    return (
        <div className="flex gap-0.5 border-b border-light mb-1 overflow-x-auto scrollbar-none">
            {APPEARANCE_TABS.map((tab) => {
                const isActive = active === tab.id
                return (
                    <button
                        key={tab.id}
                        onClick={() => onChange(tab.id)}
                        className={cn(
                            'flex items-center gap-2 px-3 sm:px-4 py-2.5 text-[13px] whitespace-nowrap border-b-2 -mb-px transition-all duration-150 shrink-0',
                            isActive
                                ? 'border-foreground text-foreground font-medium'
                                : 'border-transparent text-on-surface-muted hover:text-foreground hover:border-light-strong'
                        )}
                    >
                        <MSO
                            icon={tab.icon}
                            className="text-[16px] shrink-0"
                            fill={isActive ? 1 : 0}
                        />
                        <span>{tab.label}</span>
                    </button>
                )
            })}
        </div>
    )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function AppearanceSettings(props: AppearanceSettingsProps) {
    const [tab, setTab] = useState<TabId>('theme')

    return (
        <div className="space-y-0">
            <AppearanceTabBar active={tab} onChange={setTab} />

            <div className="pt-4 space-y-4">

                {/* ── Theme ── */}
                {tab === 'theme' && (
                    <ThemeSection
                        themeId={props.themeId}
                        setThemeId={props.setThemeId}
                        slug={props.store.slug}
                    />
                )}

                {/* ── Brand ── */}
                {tab === 'brand' && (
                    <HeroSection
                        store={props.store}
                        heroTitle={props.heroTitle} setHeroTitle={props.setHeroTitle}
                        heroSubtitle={props.heroSubtitle} setHeroSubtitle={props.setHeroSubtitle}
                        heroImage={props.heroImage} setHeroImage={props.setHeroImage}
                        heroImagePath={props.heroImagePath} setHeroImagePath={props.setHeroImagePath}
                        logoUrl={props.logoUrl} setLogoUrl={props.setLogoUrl}
                        logoPath={props.logoPath} setLogoPath={props.setLogoPath}
                    />
                )}

                {/* ── Styling: Colors + Typography stacked ── */}
                {tab === 'styling' && (
                    <>
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
                        <TypographySection
                            headingFont={props.headingFont} setHeadingFont={props.setHeadingFont}
                            bodyFont={props.bodyFont} setBodyFont={props.setBodyFont}
                            borderRadius={props.borderRadius} setBorderRadius={props.setBorderRadius}
                        />
                    </>
                )}

                {/* ── Components: Hero image + Slides + Gallery ── */}
                {tab === 'components' && (
                    <>
                        <SlidesSection
                            store={props.store}
                            heroSlides={props.heroSlides}
                            setHeroSlides={props.setHeroSlides}
                        />
                        <GallerySection
                            store={props.store}
                            galleryPhotos={props.galleryPhotos}
                            setGalleryPhotos={props.setGalleryPhotos}
                        />
                    </>
                )}
            </div>
        </div>
    )
}