'use client'

import Link from 'next/link'
import { ArrowRight, CheckCircle2, Star, Users, Award } from 'lucide-react'
import type { StoreFrontProps } from '../types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(amount: number, currency: string) {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency, minimumFractionDigits: 0 }).format(amount)
}

// ─── Services StoreFront ───────────────────────────────────────────────────────

export default function ServicesStoreFront({
    store,
    products,
    featuredProducts,
}: StoreFrontProps) {
    const settings = store.settings ?? {}
    const heroImage = settings.heroImage ?? settings.heroImagePath ?? null
    const displayProducts = featuredProducts.length > 0 ? featuredProducts : products.slice(0, 6)

    const benefits = [
        {
            icon: Star,
            title: 'Expert Professionals',
            body: 'Our team brings years of proven experience and deep domain expertise to every engagement.',
        },
        {
            icon: Users,
            title: 'Client-Centred Approach',
            body: 'We listen first, then craft solutions tailored exactly to your goals and context.',
        },
        {
            icon: Award,
            title: 'Results You Can Measure',
            body: 'Every service we deliver is tied to clear outcomes and tangible value for your business.',
        },
    ]

    return (
        <div className="min-h-screen bg-[#f8fafc] text-[#0f172a]" style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}>

            {/* ── HERO ── */}
            <section className="relative w-full overflow-hidden">
                {heroImage ? (
                    <>
                        <div className="relative h-[65vh] min-h-[460px]">
                            <img
                                src={heroImage}
                                alt={store.name}
                                className="absolute inset-0 w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-[#0f172a]/55" />
                            <div className="relative z-10 h-full flex items-center">
                                <div className="max-w-5xl mx-auto px-6 md:px-10 w-full">
                                    <p className="text-sm font-semibold tracking-widest uppercase text-[#93c5fd] mb-4">
                                        {store.name}
                                    </p>
                                    <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight tracking-tight max-w-2xl">
                                        What we offer
                                    </h1>
                                    {store.description && (
                                        <p className="mt-5 text-lg text-white/75 max-w-xl leading-relaxed font-light">
                                            {store.description}
                                        </p>
                                    )}
                                    <div className="mt-8 flex flex-wrap gap-4">
                                        <Link
                                            href={`/store/${store.slug}/products`}
                                            className="inline-flex items-center gap-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold px-6 py-3 rounded-lg transition-colors text-sm shadow-lg"
                                        >
                                            View Our Services
                                            <ArrowRight className="w-4 h-4" />
                                        </Link>
                                        <Link
                                            href={`/store/${store.slug}/blog`}
                                            className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white font-medium px-6 py-3 rounded-lg transition-colors text-sm border border-white/30 backdrop-blur-sm"
                                        >
                                            Read Our Insights
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div
                        className="relative overflow-hidden"
                        style={{
                            background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #1d4ed8 100%)',
                            minHeight: '520px',
                        }}
                    >
                        {/* Decorative blobs */}
                        <div className="absolute top-0 right-0 w-[480px] h-[480px] rounded-full opacity-10"
                            style={{ background: 'radial-gradient(circle, #60a5fa, transparent 70%)', transform: 'translate(30%, -30%)' }} />
                        <div className="absolute bottom-0 left-0 w-[320px] h-[320px] rounded-full opacity-10"
                            style={{ background: 'radial-gradient(circle, #3b82f6, transparent 70%)', transform: 'translate(-30%, 30%)' }} />

                        <div className="relative z-10 max-w-5xl mx-auto px-6 md:px-10 py-24 md:py-32">
                            <p className="text-sm font-semibold tracking-widest uppercase text-[#93c5fd] mb-4">
                                {store.name}
                            </p>
                            <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight tracking-tight max-w-2xl">
                                What we offer
                            </h1>
                            {store.description && (
                                <p className="mt-5 text-lg text-white/75 max-w-xl leading-relaxed font-light">
                                    {store.description}
                                </p>
                            )}
                            <div className="mt-8 flex flex-wrap gap-4">
                                <Link
                                    href={`/store/${store.slug}/products`}
                                    className="inline-flex items-center gap-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold px-6 py-3 rounded-lg transition-colors text-sm shadow-lg"
                                >
                                    View Our Services
                                    <ArrowRight className="w-4 h-4" />
                                </Link>
                                <Link
                                    href={`/store/${store.slug}/blog`}
                                    className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white font-medium px-6 py-3 rounded-lg transition-colors text-sm border border-white/25"
                                >
                                    Read Our Insights
                                </Link>
                            </div>
                        </div>
                    </div>
                )}
            </section>

            {/* ── SERVICES SECTION ── */}
            {displayProducts.length > 0 && (
                <section className="py-20 md:py-28">
                    <div className="max-w-6xl mx-auto px-6 md:px-10">
                        <div className="text-center mb-14">
                            <span className="inline-block text-xs font-semibold tracking-widest uppercase text-[#2563eb] mb-3">
                                Services
                            </span>
                            <h2 className="text-3xl md:text-4xl font-bold text-[#0f172a] tracking-tight">
                                What We Do Best
                            </h2>
                            <p className="mt-3 text-base text-[#64748b] max-w-xl mx-auto">
                                Explore our range of professional services crafted to deliver real results.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {displayProducts.map((product) => (
                                <Link
                                    key={product.id}
                                    href={`/store/${store.slug}/${product.slug}`}
                                    className="group block bg-white rounded-xl border border-[#e2e8f0] shadow-sm hover:shadow-md hover:border-[#2563eb]/30 transition-all duration-200"
                                >
                                    {/* Accent bar */}
                                    <div className="h-1 rounded-t-xl bg-[#2563eb] group-hover:bg-[#1d4ed8] transition-colors" />

                                    <div className="p-6">
                                        <h3 className="text-lg font-semibold text-[#0f172a] leading-snug mb-2 group-hover:text-[#2563eb] transition-colors">
                                            {product.name}
                                        </h3>
                                        {product.description && (
                                            <p className="text-sm text-[#64748b] leading-relaxed line-clamp-3 mb-4">
                                                {product.description}
                                            </p>
                                        )}
                                        <div className="flex items-center justify-between pt-4 border-t border-[#f1f5f9]">
                                            <span className="text-lg font-bold text-[#0f172a]">
                                                {fmt(product.price, store.currency)}
                                            </span>
                                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563eb] group-hover:gap-2 transition-all">
                                                Learn more <ArrowRight className="w-3.5 h-3.5" />
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>

                        {products.length > 6 && (
                            <div className="text-center mt-10">
                                <Link
                                    href={`/store/${store.slug}/products`}
                                    className="inline-flex items-center gap-2 border border-[#2563eb] text-[#2563eb] hover:bg-[#2563eb] hover:text-white font-semibold px-6 py-3 rounded-lg transition-colors text-sm"
                                >
                                    View All Services
                                    <ArrowRight className="w-4 h-4" />
                                </Link>
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* ── WHY CHOOSE US ── */}
            <section className="py-20 md:py-28 bg-white border-t border-[#e2e8f0]">
                <div className="max-w-6xl mx-auto px-6 md:px-10">
                    <div className="text-center mb-14">
                        <span className="inline-block text-xs font-semibold tracking-widest uppercase text-[#2563eb] mb-3">
                            Why Choose Us
                        </span>
                        <h2 className="text-3xl md:text-4xl font-bold text-[#0f172a] tracking-tight">
                            The difference is in the details
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {benefits.map(({ icon: Icon, title, body }) => (
                            <div
                                key={title}
                                className="bg-[#f8fafc] rounded-xl border border-[#e2e8f0] p-7 flex flex-col gap-4"
                            >
                                <div className="w-11 h-11 rounded-lg bg-[#eff6ff] flex items-center justify-center flex-shrink-0">
                                    <Icon className="w-5 h-5 text-[#2563eb]" />
                                </div>
                                <div>
                                    <h3 className="text-base font-semibold text-[#0f172a] mb-2">{title}</h3>
                                    <p className="text-sm text-[#64748b] leading-relaxed">{body}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Bullet-list extras */}
                    <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
                        {[
                            'Transparent pricing with no hidden fees',
                            'Dedicated point of contact throughout the project',
                            'Fast turnaround and clear communication',
                            'Satisfaction guarantee on every engagement',
                        ].map((point) => (
                            <div key={point} className="flex items-start gap-3">
                                <CheckCircle2 className="w-5 h-5 text-[#2563eb] flex-shrink-0 mt-0.5" />
                                <span className="text-sm text-[#475569]">{point}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CTA SECTION ── */}
            <section className="py-20 md:py-28 bg-[#2563eb]">
                <div className="max-w-3xl mx-auto px-6 md:px-10 text-center">
                    <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-4">
                        Ready to get started?
                    </h2>
                    <p className="text-lg text-white/80 mb-8 font-light leading-relaxed">
                        Browse our services and take the first step towards the results you've been looking for.
                    </p>
                    <Link
                        href={`/store/${store.slug}/products`}
                        className="inline-flex items-center gap-2 bg-white text-[#2563eb] hover:bg-[#f1f5f9] font-bold px-8 py-4 rounded-lg transition-colors text-base shadow-lg"
                    >
                        Explore Our Services
                        <ArrowRight className="w-5 h-5" />
                    </Link>
                </div>
            </section>

            {/* ── FOOTER ── */}
            <footer className="bg-[#0f172a] text-white/60 py-12">
                <div className="max-w-6xl mx-auto px-6 md:px-10">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div>
                            <p className="text-white font-semibold text-base mb-1">{store.name}</p>
                            {store.description && (
                                <p className="text-sm text-white/50 max-w-xs line-clamp-2">{store.description}</p>
                            )}
                        </div>
                        <nav className="flex flex-wrap gap-6 text-sm">
                            <Link href={`/store/${store.slug}/products`} className="hover:text-white transition-colors">
                                Services
                            </Link>
                            <Link href={`/store/${store.slug}/blog`} className="hover:text-white transition-colors">
                                Insights
                            </Link>
                            <Link href={`/store/${store.slug}/cart`} className="hover:text-white transition-colors">
                                Cart
                            </Link>
                        </nav>
                    </div>
                    <div className="mt-8 pt-6 border-t border-white/10 text-center text-xs text-white/30">
                        &copy; {new Date().getFullYear()} {store.name}. All rights reserved.
                    </div>
                </div>
            </footer>
        </div>
    )
}
