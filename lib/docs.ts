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
    title: string
    description: string
    icon: React.ReactNode
    beta?: boolean
    sections: DocSection[]
}
