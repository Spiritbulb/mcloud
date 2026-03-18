// lib/markdown.ts
// Server-side markdown → HTML. Call this in server pages only.
// remark + rehype run in Node — no browser APIs, no Turbopack issues.
//
// Install: npm install remark remark-html remark-gfm

import { remark } from 'remark'
import remarkGfm from 'remark-gfm'
import remarkHtml from 'remark-html'

export async function markdownToHtml(markdown: string): Promise<string> {
    const result = await remark()
        .use(remarkGfm)
        .use(remarkHtml, { sanitize: false })
        .process(markdown)
    return result.toString()
}