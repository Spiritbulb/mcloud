import type { MetadataRoute } from "next"
import { getDocs } from "@/lib/docs-data"
import { docsSitemapEntries } from "@/lib/docs-logic"
import { GUIDES } from "@/lib/guides"

// Public, indexable marketing routes only. The merchant dashboard, admin, and
// API are not listed (auth-gated / non-content). Keep in sync with the pages
// under app/(marketing). Docs and guides are listed from their sources.
const BASE = "https://mcloud.co.ke"

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes = ["", "/beta", "/contact", "/docs", "/support"]
  const pages: MetadataRoute.Sitemap = routes.map((path) => ({
    url: `${BASE}${path}`,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.7,
  }))
  // A DB outage still yields the guides (static) and the marketing pages.
  const docs = await getDocs().catch(() => [])
  return [...pages, ...docsSitemapEntries(docs, GUIDES)]
}
