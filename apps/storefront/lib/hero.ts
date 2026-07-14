// lib/hero.ts
// The hero has ONE shape: a list of slides. A single-image hero is a list of one.
//
// It did not start that way. Stores were written with flat keys (heroTitle,
// heroSubtitle, heroImage, heroAccent, heroButtonText) and a SEPARATE heroSlides
// array, and the template branched between them. That meant the hero was editable
// in one shape and not the other, and every hero feature had to be built twice.
//
// So the flat keys are still READ (no store breaks), but nothing writes them any
// more: the Editor always writes heroSlides. This function is the one place that
// knows both shapes, and it is the seam where the legacy form disappears.

export interface HeroSlide {
    image: string
    title: string
    subtitle: string
    accent: string
    buttonText: string
}

interface Ctx {
    /** stores.settings */
    settings: Record<string, unknown> | null | undefined
    storeName: string
    storeDescription?: string | null
    /** From the vertical. Decides the default copy, since a shop and an NGO differ. */
    commerce: boolean
    /** Is there a campaign to donate to? Decides the CTA. */
    hasCampaign: boolean
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '')

/** The copy a hero falls back to when the merchant has written none. */
function defaults(ctx: Ctx): { accent: string; buttonText: string } {
    if (ctx.commerce) return { accent: 'New Arrivals', buttonText: 'Shop now' }
    if (ctx.hasCampaign) return { accent: '', buttonText: 'Donate' }
    // A giving site with no campaign yet: "Donate" would be a promise it cannot
    // keep, so ask for contact instead.
    return { accent: '', buttonText: 'Get in touch' }
}

/**
 * Every hero, in one shape.
 *
 * Precedence for a legacy store, preserved exactly as the template had it:
 *   heroTitle > missionHeadline > store.name
 *   heroSubtitle > mission > store.description
 */
export function heroSlides(ctx: Ctx): HeroSlide[] {
    const s = ctx.settings ?? {}
    const d = defaults(ctx)

    // The modern shape. If it exists, it is the whole truth.
    const raw = s.heroSlides
    if (Array.isArray(raw) && raw.length > 0) {
        return raw
            .filter((x): x is Record<string, unknown> => typeof x === 'object' && x !== null)
            .map((x) => ({
                image: str(x.image),
                title: str(x.title),
                subtitle: str(x.subtitle),
                accent: str(x.accent),
                buttonText: str(x.buttonText) || d.buttonText,
            }))
    }

    // The legacy shape, normalised into a single slide. Read, never written.
    return [{
        image: str(s.heroImage),
        title: str(s.heroTitle) || str(s.missionHeadline) || ctx.storeName,
        subtitle: str(s.heroSubtitle) || str(s.mission) || str(ctx.storeDescription),
        accent: str(s.heroAccent) || d.accent,
        buttonText: str(s.heroButtonText) || d.buttonText,
    }]
}

/**
 * The slides a merchant has actually AUTHORED, for the Editor to write back.
 *
 * This is what makes the legacy shape disappear: the first time a merchant edits
 * their hero, the Editor saves this list as heroSlides, and the flat keys stop
 * being consulted. It differs from heroSlides() in that it never substitutes a
 * default — saving "Shop now" as though the merchant typed it would freeze a
 * default into their record, the same trap the text editor guards against.
 */
export function authoredSlides(settings: Record<string, unknown> | null | undefined): HeroSlide[] {
    const s = settings ?? {}
    const raw = s.heroSlides
    if (Array.isArray(raw) && raw.length > 0) {
        return raw
            .filter((x): x is Record<string, unknown> => typeof x === 'object' && x !== null)
            .map((x) => ({
                image: str(x.image),
                title: str(x.title),
                subtitle: str(x.subtitle),
                accent: str(x.accent),
                buttonText: str(x.buttonText),
            }))
    }
    return [{
        image: str(s.heroImage),
        title: str(s.heroTitle),
        subtitle: str(s.heroSubtitle),
        accent: str(s.heroAccent),
        buttonText: str(s.heroButtonText),
    }]
}
