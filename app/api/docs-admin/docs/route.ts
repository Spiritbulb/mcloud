import { NextRequest, NextResponse } from "next/server"
import { createHash } from "crypto"
import { promises as fs } from "fs"
import path from "path"
import { DOCS } from "@/lib/docs"

// ─── Auth ─────────────────────────────────────────────────────────────────────

function isAuthed(req: NextRequest): boolean {
    const token = req.cookies.get("docs_admin_token")?.value
    if (!token) return false
    const correct = process.env.DOCS_ADMIN_PASSPHRASE ?? "menengai-docs-admin"
    const expected = createHash("sha256").update(correct + "mcloud-docs-salt").digest("hex")
    return token === expected
}

// ─── Icon maps ────────────────────────────────────────────────────────────────

/** Page id → icon component name (for existing pages) */
const PAGE_ICON_ID: Record<string, string> = {
    general: "Store",
    appearance: "Palette",
    products: "Package",
    orders: "ShoppingBag",
    blog: "FileText",
    domain: "Globe",
    social: "Link2",
    payments: "CreditCard",
    notifications: "Bell",
}

/** Icon component name → JSX string */
const ICON_JSX: Record<string, string> = {
    Store: `<Store className="w-4 h-4" />`,
    Palette: `<Palette className="w-4 h-4" />`,
    Package: `<Package className="w-4 h-4" />`,
    ShoppingBag: `<ShoppingBag className="w-4 h-4" />`,
    FileText: `<FileText className="w-4 h-4" />`,
    Globe: `<Globe className="w-4 h-4" />`,
    Link2: `<Link2 className="w-4 h-4" />`,
    CreditCard: `<CreditCard className="w-4 h-4" />`,
    Bell: `<Bell className="w-4 h-4" />`,
    Shield: `<Shield className="w-4 h-4" />`,
    Sparkles: `<Sparkles className="w-4 h-4" />`,
    Info: `<Info className="w-4 h-4" />`,
}

// ─── Types (serializable — no React.ReactNode) ────────────────────────────────

type EditableNote = { type: string; text: string }
type EditableField = { name: string; description: string; required?: string }
type EditableStep = { label: string; detail?: string }
type EditableSection = {
    id: string
    title: string
    summary: string
    body?: string[]
    steps?: EditableStep[]
    fields?: EditableField[]
    notes?: EditableNote[]
}
type EditablePage = {
    id: string
    title: string
    description: string
    beta?: boolean
    iconId: string
    sections: EditableSection[]
}

// ─── TSX Generator ────────────────────────────────────────────────────────────

function generateDocsTsx(pages: EditablePage[]): string {
    const L: string[] = []

    L.push(`import { Store, Palette, Package, ShoppingBag, CreditCard, Globe, Link2, Bell, Shield, FileText, CheckCircle2, AlertTriangle, Info, Sparkles } from "lucide-react"`)
    L.push(``)
    L.push(`export type DocStep = {`)
    L.push(`    label: string`)
    L.push(`    detail?: string`)
    L.push(`}`)
    L.push(``)
    L.push(`export type DocField = {`)
    L.push(`    name: string`)
    L.push(`    description: string`)
    L.push(`    required?: "required" | "optional" | "readonly"`)
    L.push(`}`)
    L.push(``)
    L.push(`export type DocNote = {`)
    L.push(`    type: "info" | "warning" | "tip"`)
    L.push(`    text: string`)
    L.push(`}`)
    L.push(``)
    L.push(`export type DocSection = {`)
    L.push(`    id: string`)
    L.push(`    title: string`)
    L.push(`    summary: string`)
    L.push(`    body?: string[]`)
    L.push(`    steps?: DocStep[]`)
    L.push(`    fields?: DocField[]`)
    L.push(`    notes?: DocNote[]`)
    L.push(`}`)
    L.push(``)
    L.push(`export type DocPage = {`)
    L.push(`    id: string`)
    L.push(`    title: string`)
    L.push(`    description: string`)
    L.push(`    icon: React.ReactNode`)
    L.push(`    beta?: boolean`)
    L.push(`    sections: DocSection[]`)
    L.push(`}`)
    L.push(`// ─── Docs Data ────────────────────────────────────────────────────────────────`)
    L.push(``)
    L.push(`export const DOCS: DocPage[] = [`)

    for (const page of pages) {
        const iconJsx = ICON_JSX[page.iconId] ?? ICON_JSX["Store"]
        L.push(`    {`)
        L.push(`        id: ${JSON.stringify(page.id)},`)
        L.push(`        title: ${JSON.stringify(page.title)},`)
        L.push(`        description: ${JSON.stringify(page.description)},`)
        L.push(`        icon: ${iconJsx},`)
        if (page.beta) L.push(`        beta: true,`)
        L.push(`        sections: [`)

        for (const s of page.sections) {
            L.push(`            {`)
            L.push(`                id: ${JSON.stringify(s.id)},`)
            L.push(`                title: ${JSON.stringify(s.title)},`)
            L.push(`                summary: ${JSON.stringify(s.summary)},`)

            if (s.body?.length) {
                L.push(`                body: [`)
                for (const b of s.body) L.push(`                    ${JSON.stringify(b)},`)
                L.push(`                ],`)
            }

            if (s.steps?.length) {
                L.push(`                steps: [`)
                for (const st of s.steps) {
                    const det = st.detail ? `, detail: ${JSON.stringify(st.detail)}` : ""
                    L.push(`                    { label: ${JSON.stringify(st.label)}${det} },`)
                }
                L.push(`                ],`)
            }

            if (s.fields?.length) {
                L.push(`                fields: [`)
                for (const f of s.fields) {
                    const req = f.required ? `, required: ${JSON.stringify(f.required)}` : ""
                    L.push(`                    { name: ${JSON.stringify(f.name)}, description: ${JSON.stringify(f.description)}${req} },`)
                }
                L.push(`                ],`)
            }

            if (s.notes?.length) {
                const notesStr = s.notes
                    .map((n) => `{ type: ${JSON.stringify(n.type)}, text: ${JSON.stringify(n.text)} }`)
                    .join(", ")
                L.push(`                notes: [${notesStr}],`)
            }

            L.push(`            },`)
        }

        L.push(`        ],`)
        L.push(`    },`)
    }

    L.push(`]`)
    return L.join("\n") + "\n"
}

// ─── Route handlers ───────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
    if (!isAuthed(req)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const serializable: EditablePage[] = DOCS.map(({ icon: _icon, ...rest }) => ({
        ...rest,
        iconId: PAGE_ICON_ID[rest.id] ?? "Store",
    }))

    return NextResponse.json(serializable)
}

export async function PUT(req: NextRequest) {
    if (!isAuthed(req)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const pages: EditablePage[] = await req.json()
    const content = generateDocsTsx(pages)
    const filePath = path.join(process.cwd(), "lib/docs.tsx")

    await fs.writeFile(filePath, content, "utf-8")
    return NextResponse.json({ ok: true })
}
