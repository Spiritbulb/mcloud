'use client'

import { useState } from 'react'
import { Check, ExternalLink, ChevronDown, Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SettingsSection, SettingsField } from '../../app/store/[slug]/settings/settings-primitives'
import ImageUpload from './image-upload'
import { THEMES } from '../../src/themes'

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

// ─── Constants ────────────────────────────────────────────────────────────────

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
                <label className="relative w-7 h-7 shrink-0 border border-light cursor-pointer overflow-hidden">
                    <div className="absolute inset-0" style={{ backgroundColor: value }} />
                    <input
                        type="color"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    />
                </label>
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    spellCheck={false}
                    className="settings-input font-mono text-[12px] flex-1"
                    style={{ height: 28 }}
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
                    className="inline-flex items-center gap-1.5 text-[12px] text-on-surface-muted hover:text-foreground transition-colors"
                >
                    View store <ExternalLink className="w-3 h-3" />
                </a>
            }
        >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {THEMES.map((theme) => {
                    const isActive = themeId === theme.id
                    return (
                        <button
                            key={theme.id}
                            onClick={() => setThemeId(theme.id)}
                            className={cn(
                                'text-left border p-3 transition-colors',
                                isActive
                                    ? 'border-foreground bg-surface-variant'
                                    : 'border-outline hover:border-outline-strong hover:bg-surface-variant/40'
                            )}
                        >
                            <div className="flex overflow-hidden border border-light mb-3 h-7">
                                <div className="flex-1" style={{ backgroundColor: theme.preview.background }} />
                                <div className="flex-1" style={{ backgroundColor: theme.preview.primary }} />
                                <div className="w-4" style={{ backgroundColor: theme.preview.accent }} />
                            </div>
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <p className="text-[13px] font-medium text-foreground leading-none">{theme.name}</p>
                                    <p className="text-[11px] text-on-surface-muted mt-1 leading-snug">{theme.description}</p>
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
            description="Your storefront's color palette"
            aside={
                <div className="flex items-center border border-outline">
                    <button
                        onClick={() => setMode('light')}
                        className={cn(
                            'flex items-center gap-1.5 px-2.5 h-7 text-[12px] transition-colors',
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
                            'flex items-center gap-1.5 px-2.5 h-7 text-[12px] transition-colors',
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                    <ColorRow label="Primary" value={props.primaryColor} onChange={props.setPrimaryColor} />
                    <ColorRow label="Secondary" value={props.secondaryColor} onChange={props.setSecondaryColor} />
                    <ColorRow label="Accent" value={props.accentColor} onChange={props.setAccentColor} />
                    <ColorRow label="Background" value={props.bgColor} onChange={props.setBgColor} />
                    <ColorRow label="Foreground" value={props.fgColor} onChange={props.setFgColor} />
                    <ColorRow label="Muted" value={props.mutedColor} onChange={props.setMutedColor} />
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                    <ColorRow label="Primary" value={props.darkPrimaryColor} onChange={props.setDarkPrimaryColor} />
                    <ColorRow label="Background" value={props.darkBgColor} onChange={props.setDarkBgColor} />
                    <ColorRow label="Foreground" value={props.darkFgColor} onChange={props.setDarkFgColor} />
                    <ColorRow label="Muted" value={props.darkMutedColor} onChange={props.setDarkMutedColor} />
                </div>
            )}
        </SettingsSection>
    )
}

// ─── TypographySection ────────────────────────────────────────────────────────

function TypographySection(props: Pick<AppearanceSettingsProps,
    | 'headingFont' | 'setHeadingFont'
    | 'bodyFont' | 'setBodyFont'
    | 'borderRadius' | 'setBorderRadius'
>) {
    return (
        <SettingsSection title="Typography & Shape">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                <SettingsField label="Heading font">
                    <select value={props.headingFont} onChange={(e) => props.setHeadingFont(e.target.value)} className="settings-input">
                        {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
                    </select>
                </SettingsField>
                <SettingsField label="Body font">
                    <select value={props.bodyFont} onChange={(e) => props.setBodyFont(e.target.value)} className="settings-input">
                        {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
                    </select>
                </SettingsField>
            </div>

            {/* Live font preview */}
            <div className="mt-5 p-4 border border-light bg-surface-variant/30 space-y-1.5">
                <p style={{ fontFamily: props.headingFont, fontWeight: 600, fontSize: 14, lineHeight: 1.3 }}>
                    Heading — {props.headingFont}
                </p>
                <p style={{ fontFamily: props.bodyFont, fontSize: 13, opacity: 0.6, lineHeight: 1.5 }}>
                    Body text — the quick brown fox jumps over the lazy dog.
                </p>
            </div>

            <div className="mt-5">
                <SettingsField label="Button & card radius">
                    <div className="flex gap-2 flex-wrap mt-1">
                        {BORDER_RADII.map((r) => (
                            <button
                                key={r.value}
                                onClick={() => props.setBorderRadius(r.value)}
                                className={cn(
                                    'h-8 px-4 text-[12px] border transition-colors',
                                    props.borderRadius === r.value
                                        ? 'bg-foreground text-surface border-foreground'
                                        : 'bg-background text-on-surface-muted border-light hover:border-outline-strong hover:text-foreground'
                                )}
                            >
                                {r.label}
                            </button>
                        ))}
                    </div>
                </SettingsField>
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
        <SettingsSection title="Hero" description="Shown at the top of your storefront">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                <SettingsField label="Title">
                    <input
                        value={props.heroTitle}
                        onChange={(e) => props.setHeroTitle(e.target.value)}
                        placeholder={store.name}
                        className="settings-input"
                    />
                </SettingsField>
                <SettingsField label="Subtitle">
                    <input
                        value={props.heroSubtitle}
                        onChange={(e) => props.setHeroSubtitle(e.target.value)}
                        placeholder="Free shipping on all orders"
                        className="settings-input"
                    />
                </SettingsField>
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
                <SettingsField label="Logo">
                    <div className="flex items-center gap-3">
                        {props.logoUrl && (
                            <img src={props.logoUrl} alt="Logo" className="w-10 h-10 object-cover border border-outline shrink-0" />
                        )}
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
                </SettingsField>
            </div>
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
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-outline bg-surface-variant/30">
                <button
                    onClick={() => setOpen(!open)}
                    className="flex items-center gap-2 text-[12px] font-medium text-foreground"
                >
                    <ChevronDown className={cn('w-3.5 h-3.5 text-on-surface-muted transition-transform', open && 'rotate-180')} />
                    Slide {idx + 1}
                    {slide.title && (
                        <span className="text-on-surface-muted font-normal truncate max-w-[140px]">— {slide.title}</span>
                    )}
                </button>
                <div className="flex items-center gap-1">
                    {(['up', 'down'] as const).map((dir) => (
                        <button
                            key={dir}
                            disabled={dir === 'up' ? idx === 0 : idx === total - 1}
                            onClick={() => onMove(dir)}
                            className="w-6 h-6 flex items-center justify-center text-[11px] border border-outline text-on-surface-muted hover:text-foreground disabled:opacity-30 transition-colors"
                        >{dir === 'up' ? '↑' : '↓'}</button>
                    ))}
                    <button
                        onClick={onRemove}
                        className="w-6 h-6 flex items-center justify-center text-[11px] border border-outline text-on-surface-muted hover:text-red-500 transition-colors"
                    >×</button>
                </div>
            </div>

            {open && (
                <div className="p-4 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                        <SettingsField label="Title">
                            <input value={slide.title} onChange={(e) => onChange({ ...slide, title: e.target.value })} placeholder="Your statement" className="settings-input" />
                        </SettingsField>
                        <SettingsField label="Subtitle">
                            <input value={slide.subtitle ?? ''} onChange={(e) => onChange({ ...slide, subtitle: e.target.value })} placeholder="Discover our bestsellers…" className="settings-input" />
                        </SettingsField>
                        <SettingsField label="Accent badge">
                            <input value={slide.accent ?? ''} onChange={(e) => onChange({ ...slide, accent: e.target.value })} placeholder="New Arrivals" className="settings-input" />
                        </SettingsField>
                        <SettingsField label="Button text">
                            <input value={slide.buttonText ?? ''} onChange={(e) => onChange({ ...slide, buttonText: e.target.value })} placeholder="Shop now" className="settings-input" />
                        </SettingsField>
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
                    className="btn-secondary h-7 px-3 text-[12px]"
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
            <HeroSection
                store={props.store}
                heroTitle={props.heroTitle} setHeroTitle={props.setHeroTitle}
                heroSubtitle={props.heroSubtitle} setHeroSubtitle={props.setHeroSubtitle}
                heroImage={props.heroImage} setHeroImage={props.setHeroImage}
                heroImagePath={props.heroImagePath} setHeroImagePath={props.setHeroImagePath}
                logoUrl={props.logoUrl} setLogoUrl={props.setLogoUrl}
                logoPath={props.logoPath} setLogoPath={props.setLogoPath}
            />
            <SlidesSection store={props.store} heroSlides={props.heroSlides} setHeroSlides={props.setHeroSlides} />
        </div>
    )
}