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
// These MUST match the `--background` token in globals.css so the status bar
// blends into the app surface (no seam). Keep in sync if --background changes:
//   light :root  --background: 252 252 255  -> #FCFCFF
//   .dark        --background:  26  28  30  -> #1A1C1E
const COLORS = {
  light: "#FCFCFF",
  dark: "#1A1C1E",
} as const

export function ThemeColorSync() {
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    const color = resolvedTheme === "dark" ? COLORS.dark : COLORS.light

    // Own ONE dedicated <meta> tag and update its content. Crucially, do NOT
    // touch the per-scheme <meta theme-color> tags React renders from
    // viewport.themeColor: removing a React-managed DOM node desyncs React's
    // fiber tree from the real DOM and crashes the next client navigation with
    // "Cannot read properties of null (reading 'removeChild')" in
    // commitDeletionEffectsOnFiber. Our tag carries no `media` and is appended
    // last, so the browser uses it regardless of OS scheme — the status bar
    // follows the *resolved* theme, which is the whole point.
    let meta = document.head.querySelector<HTMLMetaElement>(
      "meta[data-theme-color-sync]",
    )
    if (!meta) {
      meta = document.createElement("meta")
      meta.setAttribute("name", "theme-color")
      meta.setAttribute("data-theme-color-sync", "")
      document.head.appendChild(meta)
    }
    meta.setAttribute("content", color)
  }, [resolvedTheme])

  return null
}
