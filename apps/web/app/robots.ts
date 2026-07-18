import type { MetadataRoute } from "next"

// Allow crawling of public pages; keep bots out of the auth-gated merchant
// dashboard, admin, API, and invite/onboarding flows (no SEO value, and some
// carry tokens). Points crawlers at the sitemap.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/org/", "/admin/", "/api/", "/invite/", "/onboarding"],
    },
    sitemap: "https://mcloud.co.ke/sitemap.xml",
    host: "https://mcloud.co.ke",
  }
}
