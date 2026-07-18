import type { MetadataRoute } from "next"

// Public, indexable marketing routes only. The merchant dashboard, admin, and
// API are not listed (auth-gated / non-content). Keep in sync with the pages
// under app/(marketing).
const BASE = "https://mcloud.co.ke"

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  const routes = ["", "/beta", "/contact", "/docs", "/support", "/changelog"]
  return routes.map((path) => ({
    url: `${BASE}${path}`,
    lastModified: now,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.7,
  }))
}
