// Pure rules for the /start wizard, shared by the client form and the server action so
// both enforce the same thing. Keep database access out of here.
import { slugFromName, slugProblem } from '@mcloud/merchant/slug'

export const SITE_TYPES = ['shop', 'ngo'] as const
export type SiteType = (typeof SITE_TYPES)[number]

export function isSiteType(value: unknown): value is SiteType {
    return typeof value === 'string' && (SITE_TYPES as readonly string[]).includes(value)
}

export interface LaunchInput {
    type: string
    name: string
    slug: string
}

export const NAME_MIN = 2
export const NAME_MAX = 60

/** First problem with the launch input, or null when it can be submitted. */
export function launchProblem(input: LaunchInput): string | null {
    if (!isSiteType(input.type)) return 'Choose what you are building'
    const name = input.name.trim()
    if (name.length < NAME_MIN) return `Name must be at least ${NAME_MIN} characters`
    if (name.length > NAME_MAX) return `Name must be at most ${NAME_MAX} characters`
    return slugProblem(input.slug)
}

/**
 * Keep the address in step with the name until the person edits the address themselves.
 * `touched` is true once they have typed in the address field.
 */
export function nextSlug(name: string, currentSlug: string, touched: boolean): string {
    return touched ? currentSlug : slugFromName(name).slice(0, 40)
}
