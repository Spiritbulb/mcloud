// Options and rules for the new-server form (new-server-form.tsx): zones, plans and OS templates
// from UpCloud, sorted and grouped for people in Kenya. Pure, tested in new-server-logic.test.ts.

export type Zone = { id: string; description: string }
export type Plan = { name: string; core_number: number; memory_amount: number; storage_size: number }
export type Template = { uuid: string; title: string; os: string }
export type PlanTier = 'Starter' | 'Premium'
export type ZoneMeta = { country: string; city: string; flag: string; region?: string }

export const DEFAULT_ZONE = 'nl-ams1'
/** Closest regions by typical routes from Kenyan ISPs, best first. */
export const KENYA_RECOMMENDED_ZONES = ['nl-ams1', 'de-fra1', 'uk-lon1'] as const

/** Zones UpCloud runs on renewable energy. */
export const GREEN_ZONES = new Set(['de-fra1', 'es-mad1', 'fi-hel1', 'fi-hel2', 'dk-cph1', 'nl-ams1', 'no-svg1', 'pl-waw1', 'se-sto1', 'sg-sin1', 'uk-lon1'])

export const ZONE_META: Record<string, ZoneMeta> = {
    'au-syd1': { flag: 'au', country: 'Australia', city: 'Sydney', region: 'Asia-Pacific' },
    'de-fra1': { flag: 'de', country: 'Germany', city: 'Frankfurt', region: 'Europe' },
    'dk-cph1': { flag: 'dk', country: 'Denmark', city: 'Copenhagen', region: 'Europe' },
    'es-mad1': { flag: 'es', country: 'Spain', city: 'Madrid', region: 'Europe' },
    'fi-hel1': { flag: 'fi', country: 'Finland', city: 'Helsinki', region: 'Europe' },
    'fi-hel2': { flag: 'fi', country: 'Finland', city: 'Helsinki', region: 'Europe' },
    'nl-ams1': { flag: 'nl', country: 'Netherlands', city: 'Amsterdam', region: 'Europe' },
    'no-svg1': { flag: 'no', country: 'Norway', city: 'Stavanger', region: 'Europe' },
    'pl-waw1': { flag: 'pl', country: 'Poland', city: 'Warsaw', region: 'Europe' },
    'se-sto1': { flag: 'se', country: 'Sweden', city: 'Stockholm', region: 'Europe' },
    'sg-sin1': { flag: 'sg', country: 'Singapore', city: 'Singapore', region: 'Asia-Pacific' },
    'uk-lon1': { flag: 'gb', country: 'United Kingdom', city: 'London', region: 'Europe' },
    'us-chi1': { flag: 'us', country: 'United States', city: 'Chicago', region: 'North America' },
    'us-nyc1': { flag: 'us', country: 'United States', city: 'New York', region: 'North America' },
    'us-sjo1': { flag: 'us', country: 'United States', city: 'San Jose', region: 'North America' },
}

export const OS_FAMILIES = [
    { key: 'ubuntu', label: 'Ubuntu', recommended: true, icon: '/ubuntu-logo.png' },
    { key: 'debian', label: 'Debian', recommended: false, icon: '/debian-logo.png' },
    { key: 'fedora', label: 'Fedora', recommended: false, icon: '/fedora-logo.png' },
    { key: 'centos', label: 'CentOS', recommended: false, icon: '/centos-logo.png' },
    { key: 'rocky', label: 'Rocky Linux', recommended: false, icon: '/Rocky-Linux-logo.svg' },
    { key: 'almalinux', label: 'AlmaLinux', recommended: false, icon: '/almaLinux-logo.png' },
] as const

export type OsFamily = (typeof OS_FAMILIES)[number]['key']

export function planTier(name: string): PlanTier | 'Other' {
    if (name.startsWith('PREMIUM-')) return 'Premium'
    if (name.startsWith('STARTER-')) return 'Starter'
    return 'Other'
}

export function osFamilyOf(title: string): OsFamily | null {
    const t = title.toLowerCase()
    return OS_FAMILIES.find((f) => t.includes(f.key))?.key ?? null
}

export function formatMemory(mb: number): string {
    return `${(mb / 1024).toFixed(mb % 1024 === 0 ? 0 : 1)} GB`
}

export function formatKes(amount?: number): string {
    return amount ? `KSh ${amount.toLocaleString('en-KE')}` : '—'
}

export function planUseCase(plan: Plan): string {
    const gb = plan.memory_amount / 1024
    if (plan.core_number <= 1 && gb <= 1) return 'Small sites, test environments and bots'
    if (plan.core_number <= 2 && gb <= 4) return 'Production websites, APIs and business apps'
    if (plan.core_number <= 4 && gb <= 8) return 'Growing applications, workers and databases'
    return 'Demanding workloads and high-traffic services'
}

const recommendedIndex = (id: string) => KENYA_RECOMMENDED_ZONES.indexOf(id as (typeof KENYA_RECOMMENDED_ZONES)[number])

/** Recommended zones first (in their order), then green ones, then by id. */
export function sortZones(zones: readonly Zone[]): Zone[] {
    return [...zones].sort((a, b) => {
        const ra = recommendedIndex(a.id)
        const rb = recommendedIndex(b.id)
        if (ra !== -1 || rb !== -1) return (ra === -1 ? Infinity : ra) - (rb === -1 ? Infinity : rb)
        const green = Number(GREEN_ZONES.has(b.id)) - Number(GREEN_ZONES.has(a.id))
        return green || a.id.localeCompare(b.id)
    })
}

export function isRecommendedZone(id: string): boolean {
    return recommendedIndex(id) !== -1
}

/** The zone to start with: Amsterdam when offered, else the first. */
export function defaultZone(zones: readonly Zone[]): string {
    return zones.some((z) => z.id === DEFAULT_ZONE) ? DEFAULT_ZONE : zones[0]?.id ?? ''
}

/** Linux templates grouped by family, in UpCloud's order. Other templates are not offered. */
export function templatesByFamily(templates: readonly Template[]): Partial<Record<OsFamily, Template[]>> {
    const groups: Partial<Record<OsFamily, Template[]>> = {}
    for (const t of templates) {
        const family = osFamilyOf(t.title)
        if (family) (groups[family] ??= []).push(t)
    }
    return groups
}

/** Plans in a tier that have a price, smallest first. */
export function plansInTier(plans: readonly Plan[], tier: PlanTier, hasPrice: (name: string) => boolean): Plan[] {
    return plans
        .filter((p) => planTier(p.name) === tier && hasPrice(p.name))
        .sort((a, b) => a.core_number - b.core_number || a.memory_amount - b.memory_amount || a.storage_size - b.storage_size)
}

/** A hostname UpCloud accepts: letters, digits and hyphens in dot-separated labels, up to 128 characters. */
export function isValidHostname(hostname: string): boolean {
    return /^(?=.{1,128}$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i.test(hostname)
}
