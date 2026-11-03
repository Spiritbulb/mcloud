// Shape of a row's `data` in docs_pages. Written by /admin/docs-editor and served
// at /docs/[slug]. JSON-serializable: the icon is stored by name (iconId).

export type DocStep = {
    label: string
    detail?: string
}

export type DocField = {
    name: string
    description: string
    required?: "required" | "optional" | "readonly"
}

export type DocNote = {
    type: "info" | "warning" | "tip"
    text: string
}

export type DocSection = {
    id: string
    title: string
    summary: string
    body?: string[]
    steps?: DocStep[]
    fields?: DocField[]
    notes?: DocNote[]
}

export type DocPage = {
    id: string
    /** URL segment under /docs. Falls back to the id, then the title (see docs-logic). */
    slug?: string
    title: string
    /** Search-result title. Falls back to "<title> | Menengai Cloud Docs". */
    seoTitle?: string
    description: string
    iconId?: string
    beta?: boolean
    sections: DocSection[]
}

/** A DocPage with its URL segment resolved. */
export type ResolvedDocPage = DocPage & { slug: string }
