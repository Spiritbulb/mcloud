import { parse } from 'node-html-parser'
import type { RawItem } from '../types'

// education.go.ke/news: Drupal teaser grid. Each `.post-block` has a title link and a "Month D, YYYY" date.
export function parseMoe(html: string, base: string): RawItem[] {
  void base
  const items: RawItem[] = []
  for (const block of parse(html).querySelectorAll('.post-block')) {
    const a = block.querySelector('.post-title a')
    const title = a?.text.trim()
    const link = a?.getAttribute('href')
    if (!title || !link) continue
    const date = block.querySelector('.post-created')?.text.trim()
    // "October 27, 2026" parses as local time; pin it to Nairobi (UTC+3) midnight.
    const d = date ? new Date(`${date} 00:00:00 GMT+0300`) : null
    items.push({ title, link, published: d && !Number.isNaN(d.getTime()) ? d.toISOString() : undefined })
  }
  return items
}
