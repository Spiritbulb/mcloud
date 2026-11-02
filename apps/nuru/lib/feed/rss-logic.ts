import { XMLParser } from 'fast-xml-parser'
import type { RawItem } from './types'

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  processEntities: true,
  parseTagValue: false,
  trimValues: true,
})

type Node = Record<string, unknown>

function arr(v: unknown): unknown[] {
  return v === undefined || v === null ? [] : Array.isArray(v) ? v : [v]
}

// A text node is a string, or an object with `#text` when it carries attributes (Atom `type="html"`).
function text(v: unknown): string | undefined {
  const first = arr(v)[0]
  if (typeof first === 'string') return first
  if (first && typeof first === 'object') {
    const t = (first as Node)['#text']
    if (typeof t === 'string') return t
  }
  return undefined
}

function atomLink(v: unknown): string | undefined {
  const links = arr(v).filter((l): l is Node => !!l && typeof l === 'object')
  const pick = links.find((l) => l['@_rel'] === 'alternate') ?? links.find((l) => !l['@_rel']) ?? links[0]
  const href = pick?.['@_href']
  return typeof href === 'string' ? href : undefined
}

export function parseFeed(xml: string): RawItem[] {
  let doc: Node
  try {
    doc = parser.parse(xml) as Node
  } catch {
    return []
  }
  const channel = (doc.rss as Node | undefined)?.channel as Node | undefined
  if (channel) {
    return arr(channel.item).flatMap((i) => {
      if (!i || typeof i !== 'object') return []
      const n = i as Node
      return [{ title: text(n.title), link: text(n.link), description: text(n.description), published: text(n.pubDate) }]
    })
  }
  const feed = doc.feed as Node | undefined
  if (feed) {
    return arr(feed.entry).flatMap((e) => {
      if (!e || typeof e !== 'object') return []
      const n = e as Node
      return [{
        title: text(n.title),
        link: atomLink(n.link),
        description: text(n.summary) ?? text(n.content),
        published: text(n.published) ?? text(n.updated),
      }]
    })
  }
  return []
}
