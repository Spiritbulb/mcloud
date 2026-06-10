"use client"

import { useEffect } from "react"
import { useTheme } from "next-themes"

/**
 * Keeps the browser/TWA `theme-color` (the Android status-bar tint) in sync with
 * the *rendered* theme rather than the OS color scheme.
 *
 * Why: the static per-scheme <meta theme-color> tags react to
 * `prefers-color-scheme` (the OS), but the app's actual theme is whatever
 * next-themes resolves — which may be a manual choice saved in localStorage.
 * Without this, OS=light + user-forced-dark gives a light status bar over a
 * dark page. This effect rewrites the meta so the bar always matches the page.
 */
const COLORS = {
  light: "#fafafa",
  dark: "#0a0a0a",
} as const

export function ThemeColorSync() {
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    const color = resolvedTheme === "dark" ? COLORS.dark : COLORS.light

    // Collapse the two media-scoped tags into a single active one so our
    // value wins regardless of OS scheme, then keep it updated.
    const tags = document.querySelectorAll<HTMLMetaElement>(
      'meta[name="theme-color"]',
    )
    if (tags.length === 0) {
      const meta = document.createElement("meta")
      meta.name = "theme-color"
      meta.content = color
      document.head.appendChild(meta)
      return
    }
    tags.forEach((tag, i) => {
      if (i === 0) {
        tag.removeAttribute("media")
        tag.content = color
      } else {
        // Drop the now-redundant scheme-specific duplicates.
        tag.remove()
      }
    })
  }, [resolvedTheme])

  return null
}
