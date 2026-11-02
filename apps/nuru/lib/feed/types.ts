export type Category = 'government' | 'university' | 'media'

export type RawItem = { title?: string; link?: string; description?: string; published?: string }

export type FeedItemInput = {
  url: string
  title: string
  summary: string
  publishedAt: Date | null
  titleKey: string
}

export type Source = {
  id: number
  name: string
  kind: 'rss' | 'scrape'
  url: string
  homepage: string
  category: Category
  parser: string | null
}
