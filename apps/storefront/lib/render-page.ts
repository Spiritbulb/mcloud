// lib/render-page.ts
// Renders a data-page: loop its ordered section list, render each repo Liquid
// section with the context slice it needs, concatenate inside the shared
// min-h-screen wrapper. Unknown section types are skipped (logged), never throw.
import { renderTemplate } from '@mcloud/liquid'
import { SECTION_REGISTRY, type PageSection, type PageRenderContext, type SectionType } from './sections'

export async function renderPage(sections: PageSection[], ctx: PageRenderContext): Promise<string> {
  let body = ''
  for (const s of sections) {
    const def = SECTION_REGISTRY[s.type as SectionType]
    if (!def) {
      console.warn(`[storefront] unknown section type skipped: ${s.type}`)
      continue
    }
    body += await renderTemplate(def.templateKey, {
      ...def.pickContext(ctx),
      // `settings` is kept as-is: five templates reassign it to store.settings and
      // rely on that. The section's OWN config therefore needs an unambiguous name,
      // or it is silently shadowed in exactly those five.
      settings: s.settings ?? {},
      section: s.settings ?? {},
    })
  }
  return `<div class="min-h-screen">${body}</div>`
}
