// Server-only read of the public docs. Uses createPublicClient (no cookies) so the
// /docs pages stay statically cacheable; /api/docs revalidates them on save.
// Throws on failure: a failed ISR regeneration keeps serving the last good page,
// where returning [] would cache an empty docs site (or a 404) until the next one.

import { cache } from "react"
import { createPublicClient } from "@mcloud/db/server"
import type { DocPage, ResolvedDocPage } from "./docs"
import { resolveDocs } from "./docs-logic"

export const getDocs = cache(async (): Promise<ResolvedDocPage[]> => {
    const { data, error } = await createPublicClient()
        .from("docs_pages")
        .select("data")
        .order("position", { ascending: true })
    if (error) throw new Error(`Failed to load docs: ${error.message}`)
    return resolveDocs((data ?? []).map((row) => row.data as DocPage))
})
