'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Menu, X, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

// ─── SettingsHeader ───────────────────────────────────────────────────────────
export function SettingsHeader({
    store,
    handleSave,
    saving,
    activeTab,
    setActiveTab,
    activeLabel,
    onMenuOpen,
}: {
    store: any
    handleSave: () => void
    saving: boolean
    activeTab: string
    setActiveTab: (tab: string) => void
    activeLabel: string
    onMenuOpen: () => void
}) {
    return (
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
            <div className="container mx-auto px-4 md:px-8 h-14 flex items-center justify-between gap-4">

                {/* Left: breadcrumb on desktop, hamburger + breadcrumb on mobile */}
                <div className="flex items-center gap-2 min-w-0">
                    {/* Mobile hamburger */}
                    <button
                        onClick={onMenuOpen}
                        className="md:hidden p-1.5 -ml-1.5 text-muted-foreground hover:text-foreground transition-colors shrink-0"
                        aria-label="Open navigation"
                    >
                        <Menu className="w-5 h-5" />
                    </button>

                    {/* Breadcrumb */}
                    <div className="flex items-center gap-1.5 text-sm min-w-0">
                        <Link
                            href={`/store/${store.slug}`}
                            className="text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
                        >
                            {store.name}
                        </Link>
                        <span>/</span>
                        <button onClick={() => setActiveTab('general')} className="text-muted-foreground whitespace-nowrap">Settings</button>
                        {/* Active tab shown in breadcrumb on mobile */}
                        <span className="md:hidden flex items-center gap-1.5 min-w-0">
                            <span>/</span>
                            <button onClick={() => setActiveTab(activeTab)} className="text-foreground font-medium truncate">{activeLabel}</button>
                        </span>
                        {/* Active tab shown in breadcrumb on desktop */}
                        <span className="hidden md:flex items-center gap-1.5">
                            <span>/</span>
                            <button onClick={() => setActiveTab(activeTab)} className="text-foreground font-medium">{activeLabel}</button>
                        </span>
                    </div>
                </div>

                {/* Right: save button */}
                <Button
                    onClick={handleSave}
                    disabled={saving}
                    size="sm"
                    className="h-8 px-4 text-xs shrink-0"
                >
                    {saving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                    {saving ? 'Saving…' : 'Save changes'}
                </Button>
            </div>
        </div>
    )
}

// ─── SettingsNav ──────────────────────────────────────────────────────────────
export function SettingsNav({
    activeTab,
    setActiveTab,
    TABS,
    open,
    onClose,
}: {
    activeTab: string
    setActiveTab: (tab: string) => void
    TABS: any[]
    open: boolean
    onClose: () => void
}) {
    const handleSelect = (id: string) => {
        setActiveTab(id)
        onClose()
    }

    const NavList = ({ onSelect }: { onSelect: (id: string) => void }) => (
        <ul className="space-y-0.5">
            {TABS.map((tab) => (
                <li key={tab.id}>
                    <button
                        onClick={() => onSelect(tab.id)}
                        className={cn(
                            'w-full flex items-center justify-between gap-3 px-3 py-2 rounded-md text-sm transition-colors text-left',
                            activeTab === tab.id
                                ? 'bg-secondary text-foreground font-medium'
                                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                        )}
                    >
                        <span className="flex items-center gap-2.5">
                            {tab.icon}
                            {tab.label}
                        </span>
                    </button>
                </li>
            ))}
        </ul>
    )

    return (
        <>
            {/* Desktop sidebar */}
            <nav className="hidden md:block md:w-52 shrink-0 pt-12">
                <NavList onSelect={setActiveTab} />
            </nav>

            {/* Mobile drawer */}
            <div
                className={cn(
                    'md:hidden fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-black shadow-xl flex flex-col transition-transform duration-200 ease-in-out',
                    open ? 'translate-x-0' : '-translate-x-full'
                )}
            >
                <div className="flex items-center justify-between px-4 py-3 border-b">
                    <span className="text-sm font-semibold text-foreground">Settings</span>
                    <button
                        onClick={onClose}
                        className="p-1.5 -mr-1.5 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Close navigation"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto px-3 py-3">
                    <NavList onSelect={handleSelect} />
                </div>
            </div>
        </>
    )
}