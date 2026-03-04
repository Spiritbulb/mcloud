'use client'

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Trash2 } from 'lucide-react'
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

interface AppearanceSettingsProps {
    store: StoreData
    // Hero content
    heroTitle: string; setHeroTitle: (v: string) => void
    heroSubtitle: string; setHeroSubtitle: (v: string) => void
    heroImage: string; setHeroImage: (v: string) => void
    logoUrl: string; setLogoUrl: (v: string) => void
    logoPath: string; setLogoPath: (v: string) => void
    heroSlides: HeroSlide[]; setHeroSlides: (v: HeroSlide[]) => void
    heroImagePath: string; setHeroImagePath: (v: string) => void
    // Theme tokens
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

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
    return (
        <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{label}</Label>
            <div className="flex items-center gap-2">
                <input
                    type="color"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-8 h-8 rounded border cursor-pointer bg-background p-0.5 appearance-none"
                />
                <Input
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="#000000"
                    className="h-8 font-mono text-xs w-28"
                />
            </div>
        </div>
    )
}

function SectionHeading({ title, description }: { title: string; description?: string }) {
    return (
        <div className="space-y-0.5">
            <p className="text-sm font-medium text-foreground">{title}</p>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
    )
}

export default function AppearanceSettings({
    store,
    heroTitle, setHeroTitle,
    heroSubtitle, setHeroSubtitle,
    heroImage, setHeroImage,
    logoUrl, setLogoUrl,
    logoPath, setLogoPath,
    heroSlides, setHeroSlides,
    heroImagePath, setHeroImagePath,
    primaryColor, setPrimaryColor,
    secondaryColor, setSecondaryColor,
    accentColor, setAccentColor,
    bgColor, setBgColor,
    fgColor, setFgColor,
    mutedColor, setMutedColor,
    darkPrimaryColor, setDarkPrimaryColor,
    darkBgColor, setDarkBgColor,
    darkFgColor, setDarkFgColor,
    darkMutedColor, setDarkMutedColor,
    headingFont, setHeadingFont,
    bodyFont, setBodyFont,
    borderRadius, setBorderRadius,
}: AppearanceSettingsProps) {
    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-base font-semibold text-foreground">Appearance</h2>
                <p className="text-sm text-muted-foreground mt-0.5">Customize how your store looks</p>
            </div>

            {/* Logo */}
            <div className="space-y-3">
                <SectionHeading title="Logo" />
                <div className="flex items-center gap-4">
                    {logoUrl && (
                        <img
                            src={logoUrl}
                            alt="Logo"
                            className="w-12 h-12 rounded-full object-cover border"
                        />
                    )}
                    <ImageUpload
                        label="Upload logo"
                        value={logoUrl}
                        pathInDb={logoPath}
                        onChange={(url, path) => { setLogoUrl(url); setLogoPath(path) }}
                        bucket="store-assets"
                        pathPrefix={`${store.id}/logo`}
                        aspectRatio="square"
                    />
                </div>
            </div>

            <Separator />

            {/* Light mode colors */}
            <div className="space-y-4">
                <SectionHeading title="Light mode colors" />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
                    <ColorField label="Primary" value={primaryColor} onChange={setPrimaryColor} />
                    <ColorField label="Secondary" value={secondaryColor} onChange={setSecondaryColor} />
                    <ColorField label="Accent" value={accentColor} onChange={setAccentColor} />
                    <ColorField label="Background" value={bgColor} onChange={setBgColor} />
                    <ColorField label="Foreground" value={fgColor} onChange={setFgColor} />
                    <ColorField label="Muted" value={mutedColor} onChange={setMutedColor} />
                </div>
            </div>

            {/* Dark mode colors */}
            <div className="space-y-4">
                <SectionHeading title="Dark mode colors" />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
                    <ColorField label="Primary" value={darkPrimaryColor} onChange={setDarkPrimaryColor} />
                    <ColorField label="Background" value={darkBgColor} onChange={setDarkBgColor} />
                    <ColorField label="Foreground" value={darkFgColor} onChange={setDarkFgColor} />
                    <ColorField label="Muted" value={darkMutedColor} onChange={setDarkMutedColor} />
                </div>
            </div>

            {/* Color preview */}
            <Card className="max-w-sm">
                <CardContent className="pt-4 pb-4 space-y-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Preview</p>
                    <div
                        className="h-14 flex items-center justify-center"
                        style={{ backgroundColor: primaryColor, borderRadius }}
                    >
                        <span
                            className="font-semibold text-sm"
                            style={{ fontFamily: headingFont, color: '#ffffff' }}
                        >
                            {heroTitle || store.name}
                        </span>
                    </div>
                    <div className="flex gap-1.5">
                        {[primaryColor, secondaryColor, accentColor, bgColor, fgColor, mutedColor].map((color, i) => (
                            <div
                                key={i}
                                className="w-5 h-5 rounded border"
                                style={{ backgroundColor: color }}
                                title={color}
                            />
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Separator />

            {/* Typography */}
            <div className="space-y-4">
                <SectionHeading title="Typography" />
                <div className="grid grid-cols-2 gap-4 max-w-sm">
                    <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Heading font</Label>
                        <Select value={headingFont} onValueChange={setHeadingFont}>
                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {FONTS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Body font</Label>
                        <Select value={bodyFont} onValueChange={setBodyFont}>
                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {FONTS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {/* Border radius */}
            <div className="space-y-3">
                <SectionHeading title="Border radius" />
                <div className="flex gap-2">
                    {BORDER_RADII.map((r) => (
                        <Button
                            key={r.value}
                            variant={borderRadius === r.value ? 'default' : 'outline'}
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => setBorderRadius(r.value)}
                        >
                            {r.label}
                        </Button>
                    ))}
                </div>
            </div>

            <Separator />

            {/* Hero content */}
            <div className="space-y-4">
                <SectionHeading title="Hero content" description="Shown at the top of your storefront" />
                <div className="space-y-4 max-w-md">
                    <div className="space-y-1.5">
                        <Label htmlFor="hero-title">Hero title</Label>
                        <Input
                            id="hero-title"
                            value={heroTitle}
                            onChange={(e) => setHeroTitle(e.target.value)}
                            placeholder={store.name}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="hero-subtitle">Hero subtitle</Label>
                        <Input
                            id="hero-subtitle"
                            value={heroSubtitle}
                            onChange={(e) => setHeroSubtitle(e.target.value)}
                            placeholder="Free shipping on all orders"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Hero image</Label>
                        <ImageUpload
                            label="Hero image"
                            value={heroImage}
                            pathInDb={heroImagePath}
                            onChange={(url, path) => { setHeroImage(url); setHeroImagePath(path) }}
                            bucket="store-assets"
                            pathPrefix={`${store.id}/hero`}
                            aspectRatio="wide"
                        />
                        <p className="text-xs text-muted-foreground">
                            Displayed as background in your store hero section
                        </p>
                    </div>
                </div>
            </div>

            {/* Hero slides */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <SectionHeading
                        title="Hero slides"
                        description="Multiple slides replace the single hero. Leave empty to use the image above."
                    />
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() =>
                            setHeroSlides([
                                ...heroSlides,
                                { title: '', subtitle: '', accent: 'New Arrivals', buttonText: 'Shop now' },
                            ])
                        }
                    >
                        + Add slide
                    </Button>
                </div>

                {heroSlides.length === 0 ? (
                    <Card className="border-dashed">
                        <CardContent className="py-8 text-center">
                            <p className="text-sm text-muted-foreground">
                                No slides added — using hero image &amp; title as a single slide.
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {heroSlides.map((slide, idx) => (
                            <Card key={idx}>
                                <CardContent className="pt-4 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                            Slide {idx + 1}
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="ghost" size="sm"
                                                className="h-6 w-6 p-0 text-muted-foreground"
                                                disabled={idx === 0}
                                                onClick={() => {
                                                    const next = [...heroSlides];
                                                    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                                                    setHeroSlides(next)
                                                }}
                                            >↑</Button>
                                            <Button
                                                variant="ghost" size="sm"
                                                className="h-6 w-6 p-0 text-muted-foreground"
                                                disabled={idx === heroSlides.length - 1}
                                                onClick={() => {
                                                    const next = [...heroSlides];
                                                    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
                                                    setHeroSlides(next)
                                                }}
                                            >↓</Button>
                                            <Button
                                                variant="ghost" size="sm"
                                                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                                onClick={() => setHeroSlides(heroSlides.filter((_, i) => i !== idx))}
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="grid gap-3 max-w-md">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs">Title *</Label>
                                            <Input
                                                value={slide.title}
                                                onChange={(e) => {
                                                    const next = [...heroSlides]
                                                    next[idx] = { ...next[idx], title: e.target.value }
                                                    setHeroSlides(next)
                                                }}
                                                placeholder="Your statement of confidence"
                                                className="h-8 text-sm"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs">Subtitle</Label>
                                            <Input
                                                value={slide.subtitle ?? ''}
                                                onChange={(e) => {
                                                    const next = [...heroSlides]
                                                    next[idx] = { ...next[idx], subtitle: e.target.value }
                                                    setHeroSlides(next)
                                                }}
                                                placeholder="Discover our bestsellers…"
                                                className="h-8 text-sm"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                                <Label className="text-xs">Accent badge</Label>
                                                <Input
                                                    value={slide.accent ?? ''}
                                                    onChange={(e) => {
                                                        const next = [...heroSlides]
                                                        next[idx] = { ...next[idx], accent: e.target.value }
                                                        setHeroSlides(next)
                                                    }}
                                                    placeholder="New Arrivals"
                                                    className="h-8 text-sm"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs">Button text</Label>
                                                <Input
                                                    value={slide.buttonText ?? ''}
                                                    onChange={(e) => {
                                                        const next = [...heroSlides]
                                                        next[idx] = { ...next[idx], buttonText: e.target.value }
                                                        setHeroSlides(next)
                                                    }}
                                                    placeholder="Shop now"
                                                    className="h-8 text-sm"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
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
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}