import type { FeedItemInput, RawItem } from './types'

const NAMED: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', ndash: '–', mdash: '—', hellip: '…',
}

function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : m
    }
    return NAMED[e.toLowerCase()] ?? m
  })
}

export function stripHtml(s: string): string {
  // Tags first, then entities, so an encoded "&lt;b&gt;" is shown as text rather than removed.
  return decodeEntities(s.replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()
}

export function clampSummary(s: string, max = 280): string {
  if (s.length <= max) return s
  const cut = s.slice(0, max - 1)
  const space = cut.lastIndexOf(' ')
  return (space > 0 ? cut.slice(0, space) : cut).replace(/[\s.,;:!?-]+$/, '') + '…'
}

export function canonicalUrl(link: string, base: string): string | null {
  let u: URL
  try {
    u = new URL(link.trim(), base)
  } catch {
    return null
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
  u.hash = ''
  for (const k of [...u.searchParams.keys()]) {
    if (k.startsWith('utm_') || k === 'fbclid' || k === 'gclid') u.searchParams.delete(k)
  }
  return u.toString()
}

export function titleKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)
}

export function normalizeItem(raw: RawItem, homepage: string, now: Date): FeedItemInput | null {
  const title = stripHtml(raw.title ?? '')
  const url = raw.link ? canonicalUrl(raw.link, homepage) : null
  if (!title || !url) return null
  let publishedAt: Date | null = null
  if (raw.published) {
    const d = new Date(raw.published)
    if (!Number.isNaN(d.getTime()) && d.getTime() <= now.getTime() + 24 * 3600 * 1000) publishedAt = d
  }
  return {
    url,
    title,
    summary: clampSummary(stripHtml(raw.description ?? '')),
    publishedAt,
    titleKey: titleKey(title),
  }
}
