'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

interface HeaderProps {
    isLoggedIn?: boolean
}

export function Header({ isLoggedIn = false }: HeaderProps) {
    const router = useRouter()
    const { resolvedTheme, setTheme } = useTheme()
    const [mounted, setMounted] = useState(false)
    useEffect(() => setMounted(true), [])

    const isDark = resolvedTheme === 'dark'
    // Light (blue) logo reads on dark backgrounds; dark logo on light. Default to light before mount.
    const logo = mounted && !isDark ? '/logo-dark.svg' : '/logo-light.svg'

    return (
        <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
            <div className="container mx-auto px-6 md:px-12 max-w-6xl">
                <div className="flex h-14 items-center justify-between">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2.5">
                        <img src={logo} alt="Menengai Cloud" className="w-12 h-auto" />
                        <span className="text-[14px] font-semibold text-foreground hidden sm:block">Menengai Cloud</span>
                    </Link>

                    {/* Nav */}
                    <nav className="hidden md:flex items-center gap-6">
                        {[
                            { href: '/docs', label: 'Docs' },
                            { href: '/changelog', label: 'Changelog' },
                            { href: '/support', label: 'Support' },
                            { href: '/contact', label: 'Contact' },
                        ].map(({ href, label }) => (
                            <Link
                                key={href}
                                href={href}
                                className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
                            >
                                {label}
                            </Link>
                        ))}
                    </nav>

                    {/* CTA */}
                    <div className="flex items-center gap-2">
                        {/* Theme toggle */}
                        <button
                            type="button"
                            aria-label="Toggle theme"
                            onClick={() => setTheme(isDark ? 'light' : 'dark')}
                            className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors"
                        >
                            <span className="material-symbols-outlined text-[18px]">
                                {mounted && !isDark ? 'dark_mode' : 'light_mode'}
                            </span>
                        </button>

                        {isLoggedIn ? (
                            <Link
                                href="/admin/org"
                                className="h-8 px-4 rounded-full bg-foreground text-background text-[13px] font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5"
                            >
                                Dashboard
                                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                            </Link>
                        ) : (
                            <>
                                <Link
                                    href="/auth/login"
                                    className="h-8 px-4 rounded-full text-[13px] text-muted-foreground hover:text-foreground transition-colors hidden sm:flex items-center"
                                >
                                    Log in
                                </Link>
                                <button
                                    onClick={() => router.push('/auth/sign-up')}
                                    className="h-8 px-4 rounded-full bg-foreground text-background text-[13px] font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5"
                                >
                                    Get started
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </header>
    )
}
