'use client'

// components/docs-editor-client.tsx
// Auth is handled entirely by the server (page.tsx).
// This component receives pre-fetched docs and focuses purely on editing.

import { useState } from "react"
import {
    Save, Plus, Trash2, ChevronDown, ChevronRight,
    Eye, AlertCircle, CheckCircle2, Loader2,
} from "lucide-react"

// ─── Types (serializable — no React.ReactNode icons) ─────────────────────────

export type EditableNote = { type: "info" | "warning" | "tip"; text: string }
export type EditableField = { name: string; description: string; required?: "required" | "optional" | "readonly" }
export type EditableStep = { label: string; detail?: string }
export type EditableSection = {
    id: string
    title: string
    summary: string
    body?: string[]
    steps?: EditableStep[]
    fields?: EditableField[]
    notes?: EditableNote[]
}
export type EditablePage = {
    id: string
    title: string
    description: string
    beta?: boolean
    iconId: string
    sections: EditableSection[]
}

const AVAILABLE_ICONS = [
    "Store", "Palette", "Package", "ShoppingBag", "CreditCard",
    "Globe", "Link2", "Bell", "Shield", "FileText", "Sparkles", "Info",
]
const NOTE_TYPES = ["info", "warning", "tip"] as const
const REQUIRED_OPTS = ["required", "optional", "readonly"] as const

// ─── Field primitives ─────────────────────────────────────────────────────────

function TF({
    label, value, onChange, mono = false, textarea = false, readOnly = false,
}: {
    label: string; value: string; onChange?: (v: string) => void
    mono?: boolean; textarea?: boolean; readOnly?: boolean
}) {
    const base = `w-full border border-border text-foreground text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary/40 transition-colors ${readOnly ? "bg-secondary/40 font-mono cursor-default" : "bg-background"} ${mono ? "font-mono" : ""}`
    return (
        <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">{label}</label>
            {textarea
                ? <textarea className={`${base} resize-none`} rows={3} value={value} readOnly={readOnly} onChange={e => onChange?.(e.target.value)} />
                : <input className={base} type="text" value={value} readOnly={readOnly} onChange={e => onChange?.(e.target.value)} />
            }
        </div>
    )
}

// ─── Sub-editors ──────────────────────────────────────────────────────────────

function BodyEditor({ body, onChange }: { body: string[]; onChange: (b: string[]) => void }) {
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Body Paragraphs</span>
                <button onClick={() => onChange([...body, ""])} className="text-xs text-primary hover:underline flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add
                </button>
            </div>
            {body.map((para, i) => (
                <div key={i} className="flex gap-2 items-start">
                    <textarea
                        className="flex-1 border border-border bg-background text-foreground text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                        rows={2}
                        value={para}
                        onChange={e => { const n = [...body]; n[i] = e.target.value; onChange(n) }}
                    />
                    <button onClick={() => onChange(body.filter((_, j) => j !== i))} className="mt-2 text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            ))}
        </div>
    )
}

function StepsEditor({ steps, onChange }: { steps: EditableStep[]; onChange: (s: EditableStep[]) => void }) {
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Steps</span>
                <button onClick={() => onChange([...steps, { label: "" }])} className="text-xs text-primary hover:underline flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add
                </button>
            </div>
            {steps.map((step, i) => (
                <div key={i} className="flex gap-2 items-start">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-2.5">{i + 1}</span>
                    <div className="flex-1 space-y-1.5">
                        <input
                            className="w-full border border-border bg-background text-foreground text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary/40"
                            placeholder="Step label"
                            value={step.label}
                            onChange={e => { const n = [...steps]; n[i] = { ...n[i], label: e.target.value }; onChange(n) }}
                        />
                        <input
                            className="w-full border border-border bg-background text-foreground text-xs rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-primary/40"
                            placeholder="Optional detail…"
                            value={step.detail ?? ""}
                            onChange={e => { const n = [...steps]; n[i] = { ...n[i], detail: e.target.value || undefined }; onChange(n) }}
                        />
                    </div>
                    <button onClick={() => onChange(steps.filter((_, j) => j !== i))} className="mt-2.5 text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            ))}
        </div>
    )
}

function FieldsEditor({ fields, onChange }: { fields: EditableField[]; onChange: (f: EditableField[]) => void }) {
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Fields</span>
                <button onClick={() => onChange([...fields, { name: "", description: "" }])} className="text-xs text-primary hover:underline flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add
                </button>
            </div>
            {fields.map((f, i) => (
                <div key={i} className="border border-border rounded-lg p-3 space-y-2">
                    <div className="flex gap-2 items-center">
                        <input
                            className="flex-1 border border-border bg-background text-foreground text-sm rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-primary/40 font-mono"
                            placeholder="Field name"
                            value={f.name}
                            onChange={e => { const n = [...fields]; n[i] = { ...n[i], name: e.target.value }; onChange(n) }}
                        />
                        <select
                            className="border border-border bg-background text-foreground text-xs rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-primary/40"
                            value={f.required ?? ""}
                            onChange={e => { const n = [...fields]; n[i] = { ...n[i], required: (e.target.value as EditableField["required"]) || undefined }; onChange(n) }}
                        >
                            <option value="">—</option>
                            {REQUIRED_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                        <button onClick={() => onChange(fields.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive transition-colors">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                    <textarea
                        className="w-full border border-border bg-background text-foreground text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                        rows={2}
                        placeholder="Description"
                        value={f.description}
                        onChange={e => { const n = [...fields]; n[i] = { ...n[i], description: e.target.value }; onChange(n) }}
                    />
                </div>
            ))}
        </div>
    )
}

function NotesEditor({ notes, onChange }: { notes: EditableNote[]; onChange: (n: EditableNote[]) => void }) {
    const typeBg: Record<string, string> = {
        info: "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800",
        warning: "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800",
        tip: "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800",
    }
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Notes</span>
                <button onClick={() => onChange([...notes, { type: "info", text: "" }])} className="text-xs text-primary hover:underline flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add
                </button>
            </div>
            {notes.map((note, i) => (
                <div key={i} className={`border rounded-lg p-3 space-y-2 ${typeBg[note.type] ?? ""}`}>
                    <div className="flex gap-2 items-center">
                        <select
                            className="border border-border bg-background text-foreground text-xs rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-primary/40"
                            value={note.type}
                            onChange={e => { const n = [...notes]; n[i] = { ...n[i], type: e.target.value as EditableNote["type"] }; onChange(n) }}
                        >
                            {NOTE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <button onClick={() => onChange(notes.filter((_, j) => j !== i))} className="ml-auto text-muted-foreground hover:text-destructive transition-colors">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                    <textarea
                        className="w-full border border-border bg-background text-foreground text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                        rows={2}
                        value={note.text}
                        onChange={e => { const n = [...notes]; n[i] = { ...n[i], text: e.target.value }; onChange(n) }}
                    />
                </div>
            ))}
        </div>
    )
}

// ─── Section editor ───────────────────────────────────────────────────────────

function SectionEditor({
    section, onUpdate, onDelete,
}: {
    section: EditableSection
    onUpdate: (s: EditableSection) => void
    onDelete: () => void
}) {
    const [expanded, setExpanded] = useState(true)
    const u = (patch: Partial<EditableSection>) => onUpdate({ ...section, ...patch })

    return (
        <div className="border border-border rounded-xl overflow-hidden">
            <div
                className="flex items-center gap-3 px-4 py-3 bg-secondary/40 cursor-pointer hover:bg-secondary/70 transition-colors select-none"
                onClick={() => setExpanded(!expanded)}
            >
                {expanded
                    ? <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    : <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                }
                <span className="flex-1 font-medium text-sm text-foreground truncate">
                    {section.title || "(Untitled section)"}
                </span>
                <span className="font-mono text-xs text-muted-foreground hidden sm:block flex-shrink-0">{section.id}</span>
                <button
                    onClick={e => { e.stopPropagation(); onDelete() }}
                    className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0 p-0.5"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>

            {expanded && (
                <div className="p-4 space-y-5">
                    <div className="grid sm:grid-cols-2 gap-4">
                        <TF label="Title" value={section.title} onChange={v => u({ title: v })} />
                        <TF label="ID" value={section.id} onChange={v => u({ id: v })} mono />
                    </div>
                    <TF label="Summary" value={section.summary} onChange={v => u({ summary: v })} textarea />
                    <BodyEditor
                        body={section.body ?? []}
                        onChange={body => u({ body: body.length ? body : undefined })}
                    />
                    <StepsEditor
                        steps={section.steps ?? []}
                        onChange={steps => u({ steps: steps.length ? steps : undefined })}
                    />
                    <FieldsEditor
                        fields={section.fields ?? []}
                        onChange={fields => u({ fields: fields.length ? fields : undefined })}
                    />
                    <NotesEditor
                        notes={section.notes ?? []}
                        onChange={notes => u({ notes: notes.length ? notes : undefined })}
                    />
                </div>
            )}
        </div>
    )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DocsEditorClient({ initialDocs }: { initialDocs: EditablePage[] }) {
    const [docs, setDocs] = useState<EditablePage[]>(initialDocs)
    const [activeId, setActiveId] = useState(initialDocs[0]?.id ?? "")
    const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle")

    async function handleSave() {
        setSaveState("saving")
        const res = await fetch("/api/docs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(docs),
        })
        setSaveState(res.ok ? "saved" : "error")
        if (res.ok) setTimeout(() => setSaveState("idle"), 2500)
    }

    // Page helpers
    const updatePage = (id: string, patch: Partial<EditablePage>) =>
        setDocs(docs.map(p => p.id === id ? { ...p, ...patch } : p))

    const updateSection = (pageId: string, sId: string, updated: EditableSection) =>
        setDocs(docs.map(p => p.id === pageId
            ? { ...p, sections: p.sections.map(s => s.id === sId ? updated : s) }
            : p
        ))

    const deleteSection = (pageId: string, sId: string) =>
        setDocs(docs.map(p => p.id === pageId
            ? { ...p, sections: p.sections.filter(s => s.id !== sId) }
            : p
        ))

    const addSection = (pageId: string) => {
        const id = `${pageId}-section-${Date.now()}`
        setDocs(docs.map(p => p.id === pageId
            ? { ...p, sections: [...p.sections, { id, title: "New Section", summary: "" }] }
            : p
        ))
    }

    const addPage = () => {
        const id = `page-${Date.now()}`
        const newPage: EditablePage = { id, title: "New Page", description: "", iconId: "Store", sections: [] }
        setDocs([...docs, newPage])
        setActiveId(id)
    }

    const deletePage = (id: string) => {
        const remaining = docs.filter(p => p.id !== id)
        setDocs(remaining)
        if (activeId === id) setActiveId(remaining[0]?.id ?? "")
    }

    const activePage = docs.find(p => p.id === activeId)

    return (
        <div className="h-screen flex flex-col bg-background overflow-hidden">
            {/* Header */}
            <header className="flex-shrink-0 border-b border-border bg-background/95 backdrop-blur px-4 sm:px-6 h-14 flex items-center gap-4 z-40">
                <span className="font-montserrat font-bold text-foreground flex-1">Docs Editor</span>
                <a
                    href="/docs"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                    <Eye className="w-4 h-4" />
                    <span className="hidden sm:inline">Preview</span>
                </a>
                {/* Auth0 logout — goes to Auth0 then redirects home */}
                <a
                    href="/api/auth/logout"
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                    <span className="hidden sm:inline">Sign out</span>
                </a>
                <button
                    onClick={handleSave}
                    disabled={saveState === "saving"}
                    className="flex items-center gap-2 bg-[#425e7b] hover:bg-[#425e7b]/90 text-white rounded-full px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60"
                >
                    {saveState === "saving" && <Loader2 className="w-4 h-4 animate-spin" />}
                    {saveState === "saved" && <CheckCircle2 className="w-4 h-4" />}
                    {saveState === "error" && <AlertCircle className="w-4 h-4" />}
                    {saveState === "saving"
                        ? "Saving…"
                        : saveState === "saved"
                            ? "Saved!"
                            : saveState === "error"
                                ? "Error"
                                : <><Save className="w-4 h-4" /><span>Save</span></>
                    }
                </button>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <aside className="hidden md:flex w-56 border-r border-border bg-secondary/20 flex-col flex-shrink-0">
                    <div className="flex-1 overflow-y-auto p-3 space-y-0.5">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-3 py-2">Pages</p>
                        {docs.map(page => (
                            <div key={page.id} className="flex items-center gap-1">
                                <button
                                    onClick={() => setActiveId(page.id)}
                                    className={`flex-1 text-left px-3 py-2 rounded-lg text-sm transition-all truncate ${activeId === page.id
                                        ? "bg-[#425e7b] text-white font-medium"
                                        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                                        }`}
                                >
                                    {page.title || "(Untitled)"}
                                </button>
                                <button
                                    onClick={() => deletePage(page.id)}
                                    className="p-1.5 text-muted-foreground hover:text-destructive transition-colors rounded flex-shrink-0"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                    <div className="p-3 border-t border-border">
                        <button
                            onClick={addPage}
                            className="w-full flex items-center justify-center gap-2 border border-dashed border-border rounded-lg py-2 text-sm text-muted-foreground hover:text-foreground hover:border-foreground/50 transition-colors"
                        >
                            <Plus className="w-4 h-4" /> Add Page
                        </button>
                    </div>
                </aside>

                {/* Content */}
                <main className="flex-1 overflow-y-auto">
                    {/* Mobile page picker */}
                    <div className="md:hidden border-b border-border px-4 py-3">
                        <select
                            className="w-full border border-border bg-background text-foreground text-sm rounded-lg px-3 py-2 outline-none"
                            value={activeId}
                            onChange={e => setActiveId(e.target.value)}
                        >
                            {docs.map(p => <option key={p.id} value={p.id}>{p.title || "(Untitled)"}</option>)}
                        </select>
                    </div>

                    {activePage ? (
                        <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8 space-y-8">
                            {/* Page meta */}
                            <div className="space-y-4 pb-6 border-b border-border">
                                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Page Settings</h2>
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <TF label="Title" value={activePage.title} onChange={v => updatePage(activeId, { title: v })} />
                                    <TF label="ID" value={activePage.id} onChange={v => updatePage(activeId, { id: v })} mono />
                                </div>
                                <TF label="Description" value={activePage.description} onChange={v => updatePage(activeId, { description: v })} />
                                <div className="flex gap-6 flex-wrap">
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-muted-foreground">Icon</label>
                                        <select
                                            className="border border-border bg-background text-foreground text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary/40"
                                            value={activePage.iconId}
                                            onChange={e => updatePage(activeId, { iconId: e.target.value })}
                                        >
                                            {AVAILABLE_ICONS.map(i => <option key={i} value={i}>{i}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex items-end gap-2 pb-0.5">
                                        <input
                                            type="checkbox"
                                            id="beta-toggle"
                                            checked={activePage.beta ?? false}
                                            onChange={e => updatePage(activeId, { beta: e.target.checked || undefined })}
                                            className="w-4 h-4 accent-primary"
                                        />
                                        <label htmlFor="beta-toggle" className="text-sm text-foreground select-none cursor-pointer">Beta</label>
                                    </div>
                                </div>
                            </div>

                            {/* Sections */}
                            <div className="space-y-4">
                                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                                    Sections ({activePage.sections.length})
                                </h2>
                                {activePage.sections.map(section => (
                                    <SectionEditor
                                        key={section.id}
                                        section={section}
                                        onUpdate={updated => updateSection(activeId, section.id, updated)}
                                        onDelete={() => deleteSection(activeId, section.id)}
                                    />
                                ))}
                                <button
                                    onClick={() => addSection(activeId)}
                                    className="w-full flex items-center justify-center gap-2 border border-dashed border-border rounded-xl py-3 text-sm text-muted-foreground hover:text-foreground hover:border-foreground/50 transition-colors"
                                >
                                    <Plus className="w-4 h-4" /> Add Section
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                            Select a page from the sidebar
                        </div>
                    )}
                </main>
            </div>
        </div>
    )
}