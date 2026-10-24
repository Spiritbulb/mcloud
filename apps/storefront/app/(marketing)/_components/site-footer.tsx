import Link from 'next/link'
import { webUrl } from '@/lib/host'

export function SiteFooter() {
    return (
        <footer className="border-t border-border">
            <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <p>&copy; {new Date().getFullYear()} Menengai Cloud, a Spiritbulb company.</p>
                <nav className="flex flex-wrap gap-x-5 gap-y-2">
                    <Link href="/moving" className="hover:text-foreground">What&rsquo;s changing</Link>
                    <a href={webUrl('/support')} className="hover:text-foreground">Support</a>
                    <a href={webUrl('/docs')} className="hover:text-foreground">Docs</a>
                    <a href={webUrl('/home')} className="hover:text-foreground">Menengai Cloud</a>
                </nav>
            </div>
        </footer>
    )
}
