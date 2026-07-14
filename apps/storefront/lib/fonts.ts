// lib/fonts.ts
// A theme stores font NAMES (heading_font, body_font). Naming a font does not
// make a browser render it: with no webfont, an uninstalled family silently
// falls back, so a store that asked for Quicksand was served the serif fallback
// instead. Build a Google Fonts stylesheet URL for whatever the theme names.
//
// Pure (no DB/Next) so it is unit-testable.

/** Families the browser already has. Requesting these from Google is a wasted
 *  round-trip and, for names like "sans-serif", not a real family at all. */
const SYSTEM_STACKS = new Set([
  'serif',
  'sans-serif',
  'monospace',
  'system-ui',
  'ui-sans-serif',
  'ui-serif',
  'ui-monospace',
  'arial',
  'helvetica',
  'helvetica neue',
  'times',
  'times new roman',
  'georgia',
  'courier',
  'courier new',
  'verdana',
  'tahoma',
  'trebuchet ms',
  'inherit',
  'initial',
])

/** Trim, drop quotes, and reject anything that is not a plain family name. */
function cleanFamily(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const name = raw.trim().replace(/^['"]|['"]$/g, '').trim()
  if (!name) return null
  // Only letters, digits and spaces. Keeps a hostile settings value from
  // smuggling anything into the URL we build.
  if (!/^[A-Za-z0-9 ]+$/.test(name)) return null
  if (SYSTEM_STACKS.has(name.toLowerCase())) return null
  return name
}

/**
 * A Google Fonts href for the given families, or null when none need fetching.
 * Families are de-duplicated, so a theme using one face for both heading and
 * body requests it once.
 */
export function googleFontsHref(families: readonly unknown[]): string | null {
  const seen = new Set<string>()
  for (const f of families) {
    const name = cleanFamily(f)
    if (name) seen.add(name)
  }
  if (seen.size === 0) return null

  // Ask for a usable weight range rather than just 400: headings need bold, and
  // a missing weight gets synthesised into a smeared faux-bold.
  const params = [...seen]
    .map((n) => `family=${n.replace(/ /g, '+')}:wght@300;400;500;600;700`)
    .join('&')

  return `https://fonts.googleapis.com/css2?${params}&display=swap`
}
