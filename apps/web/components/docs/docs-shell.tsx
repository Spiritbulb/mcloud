'use client'

// Navigation and search around the docs. Page content arrives as server-rendered
// `children`; this only adds the sidebar, the mobile drawer and the search box.
// Every nav item and result is a real link, so crawlers can follow them.

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, Menu, Search, X } from "lucide-react"
import { searchDocs, type SearchEntry } from "@/lib/docs-logic"
import { BetaBadge, DocIcon } from "./doc-blocks"

export type DocsNavItem = { href: string; title: string; iconId?: string; beta?: boolean }
export type DocsNavGroup = { label: string; href: string; items: DocsNavItem[] }

function NavGroups({ groups, onNavigate }: { groups: DocsNavGroup[]; onNavigate?: () => void }) {
    const pathname = usePathname()
    return (
        <nav aria-label="Documentation" className="space-y-6">
            {groups.map((group) => (
                <div key={group.label} className="space-y-1">
                    <Link
                        href={group.href}
                        onClick={onNavigate}
                        className="block text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 px-3 hover:text-foreground"
                    >
                        {group.label}
                    </Link>
                    {group.items.map((item) => {
                        const active = pathname === item.href
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={onNavigate}
                                aria-current={active ? "page" : undefined}
                                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${active
                                    ? "bg-[#425e7b] text-white font-medium"
                                    : "text-muted-foreground hover:text-white hover:bg-[#425e7b]/60"
                                    }`}
                            >
                                {item.iconId !== undefined && <DocIcon id={item.iconId} />}
                                <span className="flex-1 min-w-0 line-clamp-2 leading-snug">{item.title}</span>
                                {item.beta && <BetaBadge />}
                            </Link>
                        )
                    })}
                </div>
            ))}
        </nav>
    )
}

function SearchResults({ results, query, onClear }: { results: SearchEntry[]; query: string; onClear: () => void }) {
    return (
        <div className="space-y-3 sm:space-y-4">
            <p className="text-sm text-muted-foreground">
                {results.length} result{results.length !== 1 ? "s" : ""} for &ldquo;{query}&rdquo;
            </p>
            {results.length === 0 ? (
                <div className="text-center py-16 border border-border rounded-2xl bg-card">
                    <p className="text-muted-foreground text-sm">No results found. Try a different search term.</p>
                    <button onClick={onClear} className="mt-4 text-sm text-primary hover:underline">Clear search</button>
                </div>
            ) : (
                results.map((r) => (
                    <Link
                        key={r.href}
                        href={r.href}
                        onClick={onClear}
                        className="block border border-border rounded-2xl p-4 sm:p-5 hover:bg-secondary/50 transition-colors"
                    >
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1 flex-wrap">
                            <span>{r.page}</span>
                            <ChevronRight className="w-3 h-3" />
                            <span>{r.title}</span>
                        </div>
                        <p className="font-medium text-foreground text-sm sm:text-base">{r.title}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-relaxed">{r.summary}</p>
                    </Link>
                ))
            )}
        </div>
    )
}

export default function DocsShell({
    groups,
    searchIndex,
    children,
}: {
    groups: DocsNavGroup[]
    searchIndex: SearchEntry[]
    children: React.ReactNode
}) {
    const [query, setQuery] = useState("")
    const [drawerOpen, setDrawerOpen] = useState(false)
    const pathname = usePathname()
    const [seenPath, setSeenPath] = useState(pathname)

    // Navigating away (a link, back/forward) closes the drawer and the search.
    if (seenPath !== pathname) {
        setSeenPath(pathname)
        setDrawerOpen(false)
        setQuery("")
    }

    useEffect(() => {
        document.body.style.overflow = drawerOpen ? "hidden" : ""
        return () => { document.body.style.overflow = "" }
    }, [drawerOpen])

    const searching = query.trim().length > 0
    const results = searching ? searchDocs(searchIndex, query) : []
    const clear = () => setQuery("")

    return (
        <div className="min-h-screen bg-background">
            <div className="mx-auto px-6 md:px-12 max-w-page pt-10 sm:pt-12 pb-16">
                {/* Toolbar: drawer button (mobile) and search */}
                <div className="flex items-center gap-3 mb-8">
                    <button
                        onClick={() => setDrawerOpen(true)}
                        className="lg:hidden flex items-center justify-center w-10 h-10 rounded-lg border border-border hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground flex-shrink-0"
                        aria-label="Open docs menu"
                    >
                        <Menu className="w-4 h-4" />
                    </button>
                    <div role="search" className="relative w-full sm:max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" aria-hidden />
                        <input
                            type="search"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search the docs…"
                            aria-label="Search the docs"
                            className="block w-full pl-10 pr-10 py-2.5 border border-border bg-card text-foreground rounded-full outline-none focus:ring-2 focus:ring-primary text-sm transition-all"
                        />
                        {query && (
                            <button
                                onClick={clear}
                                aria-label="Clear search"
                                className="absolute inset-y-0 right-0 pr-4 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex gap-8 lg:gap-10">
                    <aside className="hidden lg:block w-60 flex-shrink-0">
                        <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pb-6">
                            <NavGroups groups={groups} />
                        </div>
                    </aside>

                    <div className="flex-1 min-w-0">
                        {searching && <SearchResults results={results} query={query} onClear={clear} />}
                        {/* Kept mounted while searching so the page HTML never leaves the DOM. */}
                        <div hidden={searching}>{children}</div>
                    </div>
                </div>
            </div>

            {drawerOpen && (
                <>
                    <div onClick={() => setDrawerOpen(false)} className="fixed inset-0 z-40 bg-black/40 lg:hidden" aria-hidden />
                    <div role="dialog" aria-modal="true" aria-label="Docs menu" className="fixed inset-y-0 left-0 z-50 w-[85%] max-w-xs bg-background border-r border-border flex flex-col lg:hidden">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Docs</p>
                            <button
                                onClick={() => setDrawerOpen(false)}
                                aria-label="Close docs menu"
                                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3">
                            <NavGroups groups={groups} onNavigate={() => setDrawerOpen(false)} />
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
