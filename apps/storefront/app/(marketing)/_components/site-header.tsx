import Link from 'next/link'
import { ThemedLogo } from '@mcloud/ui/themed-logo'

export function SiteHeader() {
    return (
        <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
            <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
                <Link href="/" className="flex items-center gap-2" aria-label="Menengai Storefronts home">
                    <ThemedLogo className="h-6 w-auto" />
                    <span className="hidden text-sm font-semibold tracking-tight sm:inline">Storefronts</span>
                </Link>
                <nav className="flex items-center gap-1 text-sm sm:gap-2">
                    <Link href="/#pricing" className="hidden px-3 py-2 text-muted-foreground hover:text-foreground sm:inline">
                        Pricing
                    </Link>
                    <Link href="/moving" className="hidden px-3 py-2 text-muted-foreground hover:text-foreground sm:inline">
                        What&rsquo;s changing
                    </Link>
                    <Link href="/login" className="px-3 py-2 text-muted-foreground hover:text-foreground">
                        Log in
                    </Link>
                    <Link
                        href="/start"
                        className="rounded-md bg-primary px-3.5 py-2 font-medium text-primary-foreground hover:opacity-90"
                    >
                        Start free
                    </Link>
                </nav>
            </div>
        </header>
    )
}
