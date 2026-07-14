// lib/render-page.ts
// Renders a data-page: loop its ordered section list, render each repo Liquid
// section with the context slice it needs, concatenate inside the shared
// min-h-screen wrapper. Unknown section types are skipped (logged), never throw.
import { renderTemplate } from '@mcloud/liquid'
import { SECTION_REGISTRY, type PageSection, type PageRenderContext, type SectionType } from './sections'

export async function renderPage(sections: PageSection[], ctx: PageRenderContext): Promise<string> {
  let body = ''
  // The INDEX is the section's identity, because that is what the Editor's rail
  // uses to address it (sections[i]). It must count every section in the stored
  // list, including any that get skipped below, or an unknown type would shift
  // every later section's id and the rail would edit the wrong one.
  let index = -1
  for (const s of sections) {
    index++
    const def = SECTION_REGISTRY[s.type as SectionType]
    if (!def) {
      console.warn(`[storefront] unknown section type skipped: ${s.type}`)
      continue
    }
    const html = await renderTemplate(def.templateKey, {
      ...def.pickContext(ctx),
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
  return `<div class="min-h-screen">${body}</div>`
}
