'use client'

import { Loader2, Menu, X } from 'lucide-react'
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
        <header className="sticky top-0 z-40 border-b border-outline bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <div className="mx-auto px-6 md:px-10 h-[52px] flex items-center justify-between gap-6 max-w-[1400px]">

                {/* Left: logo + breadcrumb */}
                <div className="flex items-center gap-0 min-w-0">
                    <button
                        onClick={onMenuOpen}
                        className="md:hidden p-1 mr-3 text-on-surface-muted hover:text-foreground transition-colors shrink-0"
                        aria-label="Open navigation"
                    >
                        <Menu className="w-[18px] h-[18px]" />
                    </button>

                    <Link href="/" className="flex items-center shrink-0">
                        <img
                            src="/favicon.ico"
                            alt="Menengai Cloud"
                            width={20}
                            height={20}
                            className=""
                        />
                    </Link>

                    {/* Render-style breadcrumb: logo / store / Settings / Active */}
                    <nav className="flex items-center text-[13px] min-w-0" aria-label="Breadcrumb">
                        <span className="text-on-surface-muted select-none px-2.5">/</span>
                        <Link
                            href={`/store/${store.slug}`}
                            className="text-on-surface-muted hover:text-foreground transition-colors whitespace-nowrap"
                        >
                            {store.name}
                        </Link>
                        <span className="text-on-surface-muted select-none px-2.5">/</span>
                        <button
                            onClick={() => setActiveTab('general')}
                            className="text-on-surface-muted hover:text-foreground transition-colors whitespace-nowrap"
                        >
                            Settings
                        </button>
                        <span className="text-on-surface-muted select-none px-2.5">/</span>
                        <span className="text-foreground font-semibold truncate">{activeLabel}</span>
                    </nav>
                </div>


            </div>
        </header>
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
        <ul className="flex flex-col">
            {TABS.map((tab) => {
                const isActive = activeTab === tab.id
                return (
                    // Render nav: full-width dividers, no rounded corners
                    <li key={tab.id} className="border-b border-outline last:border-b-0">
                        <button
                            onClick={() => onSelect(tab.id)}
                            className={cn(
                                'w-full flex items-center gap-3 px-4 py-3.5 text-[13px] transition-colors text-left',
                                isActive
                                    ? 'bg-[#425e7b] text-white font-medium'
                                    : 'text-on-surface-muted hover:text-foreground hover:bg-primary/40'
                            )}
                        >
                            <span className={cn(
                                'shrink-0 transition-colors w-[15px] h-[15px]',
                                isActive ? 'text-foreground' : 'text-on-surface-muted'
                            )}>
                                {tab.icon}
                            </span>
                            <span className="flex-1">{tab.label}</span>
                            {tab.pro && (
                                <span className={cn(
                                    'text-[9px] font-bold tracking-widest uppercase px-1.5 py-[3px] border',
                                    isActive
                                        ? 'border-outline-strong text-on-surface-muted'
                                        : 'border-outline text-on-surface-muted/60'
                                )}>
                                    BETA
                                </span>
                            )}
                        </button>
                    </li>
                )
            })}
        </ul>
    )

    return (
        <>
            {/* Desktop sidebar */}
            <nav className="hidden md:block w-64 shrink-0 border-r border-outline">
                <NavList onSelect={setActiveTab} />
            </nav>

            {/* Mobile backdrop */}
            {open && (
                <div
                    className="md:hidden fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm"
                    onClick={onClose}
                />
            )}

            {/* Mobile drawer — matches header height exactly */}
            <div
                className={cn(
                    'md:hidden fixed inset-y-0 left-0 z-50 w-64 bg-background shadow-2xl flex flex-col transition-transform duration-200 ease-out border-r border-outline',
                    open ? 'translate-x-0' : '-translate-x-full'
                )}
            >
                <div className="flex items-center justify-between px-5 h-[52px] border-b border-outline shrink-0">
                    <span className="text-[13px] font-semibold text-foreground">Settings</span>
                    <button
                        onClick={onClose}
                        className="p-1 text-on-surface-muted hover:text-foreground transition-colors"
                        aria-label="Close"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                    <NavList onSelect={handleSelect} />
                </div>
            </div>
        </>
    )
}