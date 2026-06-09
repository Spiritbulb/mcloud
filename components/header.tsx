'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface HeaderProps {
    isLoggedIn?: boolean
}

export function Header({ isLoggedIn = false }: HeaderProps) {
    const router = useRouter()
    // Header always sits on a dark background, so always use the light (blue #3fa9f5) logo
    const logo = '/logo-light.svg'

    return (
        <header className="sticky top-0 z-50 border-b border-white/8 bg-[#0a0a0a]/80 backdrop-blur-md">
            <div className="container mx-auto px-6 md:px-12 max-w-6xl">
                <div className="flex h-14 items-center justify-between">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2.5">
                        <img src={logo} alt="Menengai Cloud" className="w-12 h-auto" />
                        <span className="text-[14px] font-semibold text-white hidden sm:block">Menengai Cloud</span>
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
                                className="text-[13px] text-white/45 hover:text-white transition-colors"
                            >
                                {label}
                            </Link>
                        ))}
                    </nav>

                    {/* CTA */}
                    {isLoggedIn ? (
                        <Link
                            href="/admin/org"
                            className="h-8 px-4 rounded-full bg-white text-[#0a0a0a] text-[13px] font-semibold hover:bg-white/90 transition-colors flex items-center gap-1.5"
                        >
                            Dashboard
                            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                        </Link>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Link
                                href="/auth/login"
                                className="h-8 px-4 rounded-full text-[13px] text-white/50 hover:text-white transition-colors hidden sm:flex items-center"
                            >
                                Log in
                            </Link>
                            <button
                                onClick={() => router.push('/auth/sign-up')}
                                className="h-8 px-4 rounded-full bg-white text-[#0a0a0a] text-[13px] font-semibold hover:bg-white/90 transition-colors flex items-center gap-1.5"
                            >
                                Get started
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    )
}
