// Pure helpers for the public docs (/docs, /docs/[slug], /docs/guides/[slug]):
// URL slugs, the client search index, structured data and sitemap entries.
// No DB or Next imports so docs-logic.test.ts can run it directly.

import type { DocPage, ResolvedDocPage } from "./docs"
import type { Guide } from "./guides"

export const SITE_URL = "https://mcloud.co.ke"
export const DOCS_PATH = "/docs"
export const GUIDES_PATH = "/docs/guides"
const PUBLISHER = { "@type": "Organization", name: "Menengai Cloud", url: SITE_URL }

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function slugify(text: string): string {
    return text
        .normalize("NFKD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/&/g, " and ")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
}

export function isSlug(text: string): boolean {
    return SLUG_RE.test(text)
}

/**
 * Give every page a unique URL segment: its `slug` (normalised), else its id when
 * that is already URL-shaped, else its title. "guides" is reserved for the
 * articles route; collisions get a numeric suffix rather than being dropped.
 */
export function resolveDocs(pages: DocPage[]): ResolvedDocPage[] {
    const taken = new Set<string>(["guides"])
    return pages.map((page) => {
        const base =
            (page.slug && slugify(page.slug)) ||
            (isSlug(page.id) && !/^page-\d+$/.test(page.id) ? page.id : "") ||
            slugify(page.title) ||
            "page"
        let slug = base
        for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`
        taken.add(slug)
        return { ...page, slug }
    })
}

export function findDoc(pages: ResolvedDocPage[], slug: string): ResolvedDocPage | undefined {
    return pages.find((p) => p.slug === slug)
}

export function docPath(slug: string): string {
    return `${DOCS_PATH}/${slug}`
}

export function guidePath(slug: string): string {
    return `${GUIDES_PATH}/${slug}`
}

export function docSeoTitle(page: DocPage): string {
    return page.seoTitle?.trim() || `${page.title} | Menengai Cloud Docs`
}

// ─── Search ──────────────────────────────────────────────────────────────────

export type SearchEntry = {
    href: string
    page: string
    title: string
    summary: string
    /** Lower-cased text searched against; not displayed. */
    text: string
}

export function buildSearchIndex(pages: ResolvedDocPage[], guides: Guide[]): SearchEntry[] {
    const entries: SearchEntry[] = []
    for (const page of pages) {
        for (const s of page.sections) {
            const text = [
                s.title,
                s.summary,
                ...(s.body ?? []),
                ...(s.steps ?? []).flatMap((x) => [x.label, x.detail ?? ""]),
                ...(s.fields ?? []).flatMap((f) => [f.name, f.description]),
                ...(s.notes ?? []).map((n) => n.text),
            ]
            entries.push({
                href: `${docPath(page.slug)}#${s.id}`,
                page: page.title,
                title: s.title,
                summary: s.summary,
                text: text.join(" ").toLowerCase(),
            })
        }
    }
    for (const g of guides) {
        entries.push({
            href: guidePath(g.slug),
            page: "Guides",
            title: g.title,
            summary: g.description,
            text: [g.title, g.description, ...(g.faq ?? []).flatMap((f) => [f.q, f.a])].join(" ").toLowerCase(),
        })
    }
    return entries
}

export function searchDocs(index: SearchEntry[], query: string): SearchEntry[] {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
    if (terms.length === 0) return []
    return index.filter((e) => terms.every((t) => e.text.includes(t)))
}

// ─── Structured data (schema.org JSON-LD) ────────────────────────────────────

type Crumb = { name: string; path: string }

export function breadcrumbJsonLd(crumbs: Crumb[]) {
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: crumbs.map((c, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: c.name,
            item: `${SITE_URL}${c.path}`,
        })),
    }
}

export function docJsonLd(page: ResolvedDocPage) {
    return {
        "@context": "https://schema.org",
        "@type": "TechArticle",
        headline: page.title,
        description: page.description,
        url: `${SITE_URL}${docPath(page.slug)}`,
        inLanguage: "en-KE",
        publisher: PUBLISHER,
        articleSection: page.sections.map((s) => s.title),
    }
}

export function guideJsonLd(guide: Guide) {
    return {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: guide.title,
        description: guide.description,
        url: `${SITE_URL}${guidePath(guide.slug)}`,
        mainEntityOfPage: `${SITE_URL}${guidePath(guide.slug)}`,
        datePublished: guide.published,
        dateModified: guide.updated,
        inLanguage: "en-KE",
        author: PUBLISHER,
        publisher: PUBLISHER,
    }
}

export function faqJsonLd(faq: NonNullable<Guide["faq"]>) {
    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faq.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
    }
}

/**
 * JSON for a <script type="application/ld+json">. Escapes `<` so content
 * containing "</script>" cannot close the tag early.
 */
export function serializeJsonLd(data: unknown): string {
    return JSON.stringify(data).replace(/</g, "\\u003c")
}

// ─── Sitemap ─────────────────────────────────────────────────────────────────

export type SitemapEntry = {
    url: string
    lastModified?: Date
    changeFrequency: "weekly" | "monthly"
    priority: number
}

export function docsSitemapEntries(pages: ResolvedDocPage[], guides: Guide[]): SitemapEntry[] {
    return [
        { url: `${SITE_URL}${GUIDES_PATH}`, changeFrequency: "weekly", priority: 0.7 },
        ...guides.map((g) => ({
            url: `${SITE_URL}${guidePath(g.slug)}`,
            lastModified: new Date(g.updated),
            changeFrequency: "monthly" as const,
            priority: 0.8,
        })),
        ...pages.map((p) => ({
            url: `${SITE_URL}${docPath(p.slug)}`,
            changeFrequency: "monthly" as const,
            priority: 0.6,
        })),
    ]
}
