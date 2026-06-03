import Link from 'next/link'

export function Footer() {
    return (
        <footer className="border-t border-white/6 bg-[#0a0a0a]">
            <div className="container mx-auto px-6 md:px-12 max-w-6xl py-10">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
                    <div className="col-span-2 md:col-span-1 space-y-3">
                        <Link href="/" className="flex items-center gap-2">
                            <img src="/favicon.ico" alt="Menengai Cloud" className="w-6 h-6" />
                            <span className="text-[13px] font-semibold text-white/70">Menengai Cloud</span>
                        </Link>
                        <p className="text-[12px] text-white/25 leading-relaxed max-w-[180px]">
                            Managed platform for enterprise applications.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-white/25">Platform</p>
                        <ul className="space-y-2">
                            {[
                                { href: '/auth/sign-up', label: 'Storefront' },
                                { href: '/contact', label: 'Trading Apps' },
                            ].map(({ href, label }) => (
                                <li key={href}>
                                    <Link href={href} className="text-[13px] text-white/40 hover:text-white transition-colors">
                                        {label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="space-y-3">
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-white/25">Resources</p>
                        <ul className="space-y-2">
                            {[
                                { href: '/docs', label: 'Documentation' },
                                { href: '/changelog', label: 'Changelog' },
                                { href: '/support', label: 'Support' },
                            ].map(({ href, label }) => (
                                <li key={href}>
                                    <Link href={href} className="text-[13px] text-white/40 hover:text-white transition-colors">
                                        {label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="space-y-3">
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-white/25">Company</p>
                        <ul className="space-y-2">
                            {[
                                { href: 'https://x.com/menengaicloud', label: 'Twitter / X' },
                                { href: 'https://github.com/Spiritbulb', label: 'GitHub' },
                                { href: 'https://spiritb.uk/privacy', label: 'Privacy & Cookies' },
                            ].map(({ href, label }) => (
                                <li key={href}>
                                    <Link href={href} className="text-[13px] text-white/40 hover:text-white transition-colors">
                                        {label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="border-t border-white/6 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-[12px] text-white/20">
                        © {new Date().getFullYear()} Menengai Cloud. All rights reserved.
                    </p>
                    <p className="text-[12px] text-white/15">
                        Built by{' '}
                        <a href="https://github.com/Spiritbulb" className="hover:text-white/40 transition-colors">
                            Spiritbulb
                        </a>
                    </p>
                </div>
            </div>
        </footer>
    )
}
