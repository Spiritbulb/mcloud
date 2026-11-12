// lib/render-page.ts
// Renders a data-page: loop its ordered section list, render each repo Liquid
// section with the context slice it needs, concatenate inside the shared
// min-h-screen wrapper. Unknown section types are skipped (logged), never throw.
import { hasTemplate, renderTemplate } from '@mcloud/liquid'
import { resolveThemeId, templateKeyFor } from './store-themes'
import { SECTION_REGISTRY, type PageSection, type PageRenderContext, type SectionType } from './sections'

export async function renderPage(sections: PageSection[], ctx: PageRenderContext): Promise<string> {
  // The store's theme picks the template folder. The Editor preview passes a store
  // whose settings carry the UNSAVED themeId, so switching themes previews for free.
  const theme = resolveThemeId((ctx.store as { settings?: unknown } | null)?.settings)
  const fellBack: string[] = []
  let body = ''
  // The INDEX is the section's identity, because that is what the Editor's rail
  // uses to address it (sections[i]). It must count every section in the stored
  // list, including any that get skipped below, or an unknown type would shift
  // every later section's id and the rail would edit the wrong one.
  let index = -1
  for (const s of sections) {
    index++
    // Switched off in the Editor: nothing renders, but the index is consumed above.
    if (s.settings?.hidden === true) continue
    const def = SECTION_REGISTRY[s.type as SectionType]
    if (!def) {
      console.warn(`[storefront] unknown section type skipped: ${s.type}`)
      continue
    }
    const key = templateKeyFor(theme, def.file, hasTemplate)
    if (theme !== 'classic' && key.startsWith('classic/')) fellBack.push(def.file)
    const html = await renderTemplate(key, {
      ...def.pickContext(ctx, s.settings),
      // `settings` is kept as-is: five templates reassign it to store.settings and
      // rely on that. The section's OWN config therefore needs an unambiguous name,
      // or it is silently shadowed in exactly those five.
      settings: s.settings ?? {},
      section: s.settings ?? {},
    })
    // Anchor every section in the DOM so the Editor can scroll to it, outline it,
    // and report clicks on it. Inert for a real visitor: nothing styles or scripts
    // this attribute outside the preview.
    body += `<div data-mcloud-section="${index}">${html}</div>`
  }
  if (fellBack.length) {
    console.warn(`[storefront] theme ${theme} has no ${[...new Set(fellBack)].join(', ')}; used classic`)
  }
  return `<div class="min-h-screen">${body}</div>`
}
