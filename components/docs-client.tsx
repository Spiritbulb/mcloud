'use client'

import { useState, useRef, useEffect } from "react"
import { motion, useInView } from "framer-motion"
import {
    Store,
    Palette,
    Package,
    ShoppingBag,
    FileText,
    Globe,
    Link2,
    CreditCard,
    Bell,
    Search,
    ChevronRight,
    Info,
    AlertTriangle,
    CheckCircle2,
    X,
    Menu,
} from "lucide-react"


// ─── Types ────────────────────────────────────────────────────────────────────

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

interface DocsClientProps {
    page: string | undefined
    docs: DocPage[]
}

// ─── Helper Components ────────────────────────────────────────────────────────

function FadeIn({ children, className }: { children: React.ReactNode; className?: string }) {
    const ref = useRef(null)
    const inView = useInView(ref, { once: true, margin: "-60px" })
    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
            className={className}
        >
            {children}
        </motion.div>
    )
}

function NoteCallout({ note }: { note: DocNote }) {
    const styles = {
        info: {
            bg: "bg-blue-50 dark:bg-blue-950/30",
            border: "border-blue-200 dark:border-blue-800",
            text: "text-blue-800 dark:text-blue-200",
            icon: <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />,
        },
        warning: {
            bg: "bg-amber-50 dark:bg-amber-950/30",
            border: "border-amber-200 dark:border-amber-800",
            text: "text-amber-800 dark:text-amber-200",
            icon: <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />,
        },
        tip: {
            bg: "bg-green-50 dark:bg-green-950/30",
            border: "border-green-200 dark:border-green-800",
            text: "text-green-800 dark:text-green-200",
            icon: <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />,
        },
    }
    const s = styles[note.type]
    return (
        <div className={`flex gap-3 rounded-xl border px-4 py-3 text-sm ${s.bg} ${s.border} ${s.text}`}>
            {s.icon}
            <p className="leading-relaxed">{note.text}</p>
        </div>
    )
}

function FieldTable({ fields }: { fields: DocField[] }) {
    const badgeStyle: Record<string, string> = {
        required: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
        optional: "bg-muted text-muted-foreground",
        readonly: "bg-secondary text-secondary-foreground",
    }

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
                            <tr key={i} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                                <td className="px-4 py-3 font-mono text-xs font-medium text-foreground align-top">{f.name}</td>
                                <td className="px-4 py-3 text-muted-foreground align-top">{f.description}</td>
                                <td className="px-4 py-3 align-top">
                                    {f.required && (
                                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${badgeStyle[f.required]}`}>
                                            {f.required}
                                        </span>
                                    )}
                                </td>
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
                            {f.required && (
                                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${badgeStyle[f.required]}`}>
                                    {f.required}
                                </span>
                            )}
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

// ─── Drawer overlay for mobile sidebar ───────────────────────────────────────

function MobileDrawer({
    open,
    onClose,
    activePageId,
    onSelect,
    docs,
}: {
    docs: DocPage[]
    open: boolean
    onClose: () => void
    activePageId: string
    onSelect: (id: string) => void
}) {
    // Trap body scroll when open
    useEffect(() => {
        document.body.style.overflow = open ? "hidden" : ""
        return () => { document.body.style.overflow = "" }
    }, [open])

    if (!open) return null

    return (
        <>
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 z-40 bg-white dark:bg-black backdrop-blur-sm lg:hidden mt-14"
            />
            {/* Drawer panel */}
            <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="fixed inset-y-0 left-0 z-50 w-full bg-background border-r border-border flex flex-col lg:hidden bg-white dark:bg-black"
            >
                {/* Drawer header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Menu</p>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Nav items */}
                <nav className="flex-1 overflow-y-auto p-3 space-y-1">
                    {docs.map((page) => (
                        <button
                            key={page.id}
                            onClick={() => onSelect(page.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all text-left ${activePageId === page.id
                                ? "bg-[#425e7b] text-white font-medium"
                                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                                }`}
                        >
                            <span className="flex-shrink-0">{page.icon}</span>
                            <span className="flex-1 truncate">{page.title}</span>
                            {page.beta && (
                                <span className="text-[10px] font-bold uppercase tracking-wide bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded-full flex-shrink-0">
                                    beta
                                </span>
                            )}
                        </button>
                    ))}
                </nav>
            </motion.div>
        </>
    )
}

// ─── Main Client Component ────────────────────────────────────────────────────

export default function DocsClient({ page, docs }: DocsClientProps) {
    const [activePageId, setActivePageId] = useState<string>(page ?? docs[0].id)
    const [searchQuery, setSearchQuery] = useState("")
    const [drawerOpen, setDrawerOpen] = useState(false)
    const contentRef = useRef<HTMLDivElement>(null)

    const activePage = docs.find((p) => p.id === activePageId) ?? docs[0]

    const filteredResults: Array<{ page: DocPage; section: DocSection }> = []
    if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        for (const page of docs) {
            for (const section of page.sections) {
                const matches =
                    section.title.toLowerCase().includes(q) ||
                    section.summary.toLowerCase().includes(q) ||
                    section.body?.some((b) => b.toLowerCase().includes(q)) ||
                    section.fields?.some((f) => f.name.toLowerCase().includes(q) || f.description.toLowerCase().includes(q))
                if (matches) filteredResults.push({ page, section })
            }
        }
    }

    const isSearching = searchQuery.trim().length > 0

    function selectPage(id: string) {
        setActivePageId(id)
        setDrawerOpen(false)
        contentRef.current?.scrollTo({ top: 0, behavior: "smooth" })
        window.scrollTo({ top: 0, behavior: "smooth" })
    }

    useEffect(() => {
        contentRef.current?.scrollTo({ top: 0 })
    }, [activePageId])

    return (
        <div className="min-h-screen bg-background">
            {/* Mobile drawer */}
            <MobileDrawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                activePageId={activePageId}
                onSelect={selectPage}
                docs={docs}
            />

            {/* ── HERO ────────────────────────────────────────────────────── */}
            <section className="relative pt-14 sm:pt-12 pb-10 sm:pb-12 bg-background border-b border-border">
                <div className="container mx-auto px-4 sm:px-6 md:px-12 max-w-6xl">
                    <motion.div
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
                        className="space-y-3 sm:space-y-4"
                    >
                        {/* Mobile: hamburger in hero row */}
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setDrawerOpen(true)}
                                className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg border border-border hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground flex-shrink-0"
                                aria-label="Open navigation"
                            >
                                <Menu className="w-4 h-4" />
                            </button>
                            <p className="text-xs sm:text-sm font-medium text-primary uppercase tracking-widest">Documentation</p>
                        </div>

                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-montserrat font-bold text-foreground leading-[1.1]">
                            Store Settings Guide
                        </h1>
                        <p className="text-sm sm:text-base text-muted-foreground max-w-2xl">
                            Everything you need to configure and manage your Menengai Cloud store from general info to payments and beyond.
                        </p>

                        {/* Search — full width on mobile */}
                        <div className="relative w-full sm:max-w-lg pt-1 sm:pt-2">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search the docs…"
                                className="block w-full pl-10 pr-10 py-2.5 sm:py-3 border border-border bg-card text-foreground rounded-full outline-none focus:ring-2 focus:ring-primary text-sm transition-all"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery("")}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* ── BODY ────────────────────────────────────────────────────── */}
            <div className="container mx-auto px-4 sm:px-6 md:px-12 max-w-6xl py-8 sm:py-10">
                <div className="flex gap-8 lg:gap-10">

                    {/* ── Sidebar (desktop only) ─────────────────────────── */}
                    <aside className="hidden lg:block w-56 flex-shrink-0">
                        <div className="sticky top-24 space-y-1">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 px-3">Settings</p>
                            {docs.map((page) => (
                                <button
                                    key={page.id}
                                    onClick={() => selectPage(page.id)}
                                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all text-left ${activePageId === page.id && !isSearching
                                        ? "bg-[#425e7b] text-white font-medium"
                                        : "text-muted-foreground hover:text-white hover:bg-[#425e7b]/60"
                                        }`}
                                >
                                    {page.icon}
                                    <span className="flex-1 truncate">{page.title}</span>
                                    {page.beta && (
                                        <span className="text-[10px] font-bold uppercase tracking-wide bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded-full flex-shrink-0">
                                            beta
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </aside>

                    {/* ── Content ────────────────────────────────────────── */}
                    <main ref={contentRef} className="flex-1 min-w-0">
                        {isSearching ? (
                            /* ── Search results ──────────────────────────── */
                            <div className="space-y-3 sm:space-y-4">
                                <p className="text-sm text-muted-foreground">
                                    {filteredResults.length} result{filteredResults.length !== 1 ? "s" : ""} for &ldquo;{searchQuery}&rdquo;
                                </p>
                                {filteredResults.length === 0 ? (
                                    <div className="text-center py-16 border border-border rounded-2xl bg-card">
                                        <p className="text-muted-foreground text-sm">No results found. Try a different search term.</p>
                                        <button onClick={() => setSearchQuery("")} className="mt-4 text-sm text-primary hover:underline">
                                            Clear search
                                        </button>
                                    </div>
                                ) : (
                                    filteredResults.map(({ page, section }) => (
                                        <button
                                            key={section.id}
                                            onClick={() => { setSearchQuery(""); selectPage(page.id) }}
                                            className="w-full text-left border border-border rounded-2xl p-4 sm:p-5 hover:bg-secondary/50 transition-colors"
                                        >
                                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1 flex-wrap">
                                                {page.icon}
                                                <span>{page.title}</span>
                                                <ChevronRight className="w-3 h-3" />
                                                <span>{section.title}</span>
                                            </div>
                                            <p className="font-medium text-foreground text-sm sm:text-base">{section.title}</p>
                                            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-relaxed">{section.summary}</p>
                                        </button>
                                    ))
                                )}
                            </div>
                        ) : (
                            /* ── Page content ─────────────────────────────── */
                            <div>
                                {/* Page header */}
                                <FadeIn>
                                    <div className="flex items-start sm:items-center gap-2 sm:gap-3 mb-1 flex-wrap">
                                        <div className="text-primary mt-0.5 sm:mt-0">{activePage.icon}</div>
                                        <h2 className="text-xl sm:text-2xl md:text-3xl font-montserrat font-bold text-foreground leading-tight">
                                            {activePage.title}
                                        </h2>
                                        {activePage.beta && (
                                            <span className="text-xs font-bold uppercase tracking-wide bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-2 py-1 rounded-full">
                                                Beta
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-6 sm:mb-8">{activePage.description}</p>
                                    <div className="border-b border-border mb-6 sm:mb-8" />
                                </FadeIn>

                                {/* Sections */}
                                <div className="space-y-8 sm:space-y-10">
                                    {activePage.sections.map((section) => (
                                        <FadeIn key={section.id}>
                                            <section id={section.id} className="scroll-mt-24">
                                                <h3 className="text-base sm:text-lg font-montserrat font-semibold text-foreground mb-1">
                                                    {section.title}
                                                </h3>
                                                <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">{section.summary}</p>

                                                {section.body?.map((para, i) => (
                                                    <p key={i} className="text-sm text-foreground/80 mb-3 leading-relaxed">{para}</p>
                                                ))}

                                                {section.steps && (
                                                    <div className="mt-3 sm:mt-4">
                                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Steps</p>
                                                        <StepList steps={section.steps} />
                                                    </div>
                                                )}

                                                {section.fields && (
                                                    <div className="mt-3 sm:mt-4">
                                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Fields</p>
                                                        <FieldTable fields={section.fields} />
                                                    </div>
                                                )}

                                                {section.notes && (
                                                    <div className="mt-3 sm:mt-4 space-y-3">
                                                        {section.notes.map((note, i) => (
                                                            <NoteCallout key={i} note={note} />
                                                        ))}
                                                    </div>
                                                )}
                                            </section>
                                        </FadeIn>
                                    ))}
                                </div>

                                {/* Page nav footer */}
                                <FadeIn>
                                    <div className="mt-12 sm:mt-14 pt-6 sm:pt-8 border-t border-border flex items-center justify-between gap-4">
                                        {(() => {
                                            const idx = docs.findIndex((p) => p.id === activePage.id)
                                            const prev = docs[idx - 1]
                                            const next = docs[idx + 1]
                                            return (
                                                <>
                                                    <div className="flex-1">
                                                        {prev && (
                                                            <button
                                                                onClick={() => selectPage(prev.id)}
                                                                className="group flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors"
                                                            >
                                                                <ChevronRight className="w-4 h-4 rotate-180 flex-shrink-0" />
                                                                <span className="text-left truncate">{prev.title}</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 flex justify-end">
                                                        {next && (
                                                            <button
                                                                onClick={() => selectPage(next.id)}
                                                                className="group flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors"
                                                            >
                                                                <span className="text-right truncate">{next.title}</span>
                                                                <ChevronRight className="w-4 h-4 flex-shrink-0" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </>
                                            )
                                        })()}
                                    </div>
                                </FadeIn>
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </div>
    )
}