// Server-rendered building blocks for the public docs. Pure markup, no state,
// so section content reaches crawlers as HTML.

import {
    AlertTriangle, Bell, CheckCircle2, CreditCard, FileText, Globe, Info, Link2,
    Package, Palette, Shield, ShoppingBag, Sparkles, Store, type LucideIcon,
} from "lucide-react"
import type { DocField, DocNote, DocSection, DocStep } from "@/lib/docs"
import { serializeJsonLd } from "@/lib/docs-logic"

// The names the docs editor offers (AVAILABLE_ICONS in docs-editor-client).
const ICONS: Record<string, LucideIcon> = {
    Store, Palette, Package, ShoppingBag, CreditCard, Globe, Link2, Bell, Shield, FileText, Sparkles, Info,
}

export function DocIcon({ id, className = "w-4 h-4" }: { id?: string; className?: string }) {
    const Icon = ICONS[id ?? ""] ?? FileText
    return <Icon className={`${className} flex-shrink-0`} aria-hidden />
}

export function JsonLd({ data }: { data: unknown }) {
    return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />
}

export function BetaBadge() {
    return (
        <span className="text-[11px] font-bold uppercase tracking-wide bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded-full flex-shrink-0">
            beta
        </span>
    )
}

const NOTE_STYLES = {
    info: {
        className: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200",
        Icon: Info,
    },
    warning: {
        className: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200",
        Icon: AlertTriangle,
    },
    tip: {
        className: "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200",
        Icon: CheckCircle2,
    },
}

function NoteCallout({ note }: { note: DocNote }) {
    const { className, Icon } = NOTE_STYLES[note.type] ?? NOTE_STYLES.info
    return (
        <div className={`flex gap-3 rounded-xl border px-4 py-3 text-sm ${className}`}>
            <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden />
            <p className="leading-relaxed">{note.text}</p>
        </div>
    )
}

const BADGE_STYLES: Record<string, string> = {
    required: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    optional: "bg-muted text-muted-foreground",
    readonly: "bg-secondary text-secondary-foreground",
}

function Badge({ kind }: { kind?: DocField["required"] }) {
    if (!kind) return null
    return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${BADGE_STYLES[kind]}`}>{kind}</span>
}

function FieldTable({ fields }: { fields: DocField[] }) {
    return (
        <>
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border bg-secondary/60">
                            <th className="text-left px-4 py-3 font-medium text-foreground w-1/4">Field</th>
                            <th className="text-left px-4 py-3 font-medium text-foreground">Description</th>
                            <th className="text-left px-4 py-3 font-medium text-foreground w-24">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {fields.map((f, i) => (
                            <tr key={i} className="border-b border-border last:border-0">
                                <td className="px-4 py-3 font-mono text-xs font-medium text-foreground align-top">{f.name}</td>
                                <td className="px-4 py-3 text-muted-foreground align-top">{f.description}</td>
                                <td className="px-4 py-3 align-top"><Badge kind={f.required} /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile card stack */}
            <div className="sm:hidden space-y-2">
                {fields.map((f, i) => (
                    <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-1.5">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="font-mono text-xs font-semibold text-foreground">{f.name}</span>
                            <Badge kind={f.required} />
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
                    </div>
                ))}
            </div>
        </>
    )
}

function StepList({ steps }: { steps: DocStep[] }) {
    return (
        <ol className="space-y-3">
            {steps.map((step, i) => (
                <li key={i} className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
                        {i + 1}
                    </span>
                    <div>
                        <p className="text-sm text-foreground leading-relaxed">{step.label}</p>
                        {step.detail && <p className="text-sm text-muted-foreground mt-0.5">{step.detail}</p>}
                    </div>
                </li>
            ))}
        </ol>
    )
}

const LABEL = "text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3"

export function DocSectionView({ section }: { section: DocSection }) {
    return (
        <section id={section.id} className="scroll-mt-24">
            <h2 className="text-lg sm:text-xl font-montserrat font-semibold text-foreground mb-1">
                <a href={`#${section.id}`} className="hover:underline underline-offset-4">{section.title}</a>
            </h2>
            <p className="text-sm text-muted-foreground mb-3 sm:mb-4">{section.summary}</p>

            {section.body?.map((para, i) => (
                <p key={i} className="text-sm sm:text-[16px] text-foreground/80 mb-3 leading-relaxed">{para}</p>
            ))}

            {section.steps && (
                <div className="mt-3 sm:mt-4">
                    <h3 className={LABEL}>Steps</h3>
                    <StepList steps={section.steps} />
                </div>
            )}

            {section.fields && (
                <div className="mt-3 sm:mt-4">
                    <h3 className={LABEL}>Fields</h3>
                    <FieldTable fields={section.fields} />
                </div>
            )}

            {section.notes && (
                <div className="mt-3 sm:mt-4 space-y-3">
                    {section.notes.map((note, i) => <NoteCallout key={i} note={note} />)}
                </div>
            )}
        </section>
    )
}
