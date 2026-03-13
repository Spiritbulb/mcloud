"use client";

import { useState } from "react";
import { motion } from "framer-motion"
import { useInView } from "framer-motion"
import { useRef } from "react"

// ─── Reusable components ──────────────────────────────────────────────────────
function FadeIn({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
    const ref = useRef(null)
    const inView = useInView(ref, { once: true, margin: "-80px" })
    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 32 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.55, delay, ease: [0.25, 0.1, 0.25, 1] }}
            className={className}
        >
            {children}
        </motion.div>
    )
}

export default function StoreCarousel({ slugs }: { slugs: string[] }) {
    const [current, setCurrent] = useState(0);
    const total = slugs.length;
    const hasPrev = current > 0;
    const hasNext = current < total - 1;

    return (
        <div className="relative w-full" style={{ height: "80vh" }}>
            {/* ── Iframe slide ── */}
            <FadeIn key={current}>
                <div
                    className="group relative block border border-light bg-surface hover:border-foreground transition-colors duration-200 overflow-hidden w-full h-full"
                    style={{ height: "80vh" }}
                >
                    {/* Promoted ribbon */}
                    <div className="absolute top-5 left-[-32px] z-10 rotate-[-45deg] bg-[#425e7b]/80 backdrop-blur-sm text-white text-[11px] font-bold uppercase tracking-widest px-10 py-1 shadow-md">
                        Promoted
                    </div>

                    {/* Live iframe preview */}
                    <iframe
                        src={`https://${slugs[current]}.menengai.cloud`}
                        title={`${slugs[current]} live preview`}
                        className="w-full h-full border-0 pointer-events-none"
                        loading="lazy"
                        sandbox="allow-scripts allow-same-origin"
                    />

                    {/* Click overlay */}
                    <div className="absolute inset-0 bg-transparent group-hover:bg-foreground/5 transition-colors duration-200" />
                </div>
            </FadeIn>

            {/* ── Carousel controls (only shown when more than 1 slug) ── */}
            {total > 1 && (
                <>
                    {/* Prev */}
                    <button
                        onClick={() => setCurrent((c) => Math.max(c - 1, 0))}
                        disabled={!hasPrev}
                        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center bg-background/80 backdrop-blur-sm border border-outline hover:border-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
                        aria-label="Previous store"
                    >
                        ←
                    </button>

                    {/* Next */}
                    <button
                        onClick={() => setCurrent((c) => Math.min(c + 1, total - 1))}
                        disabled={!hasNext}
                        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center bg-background/80 backdrop-blur-sm border border-outline hover:border-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
                        aria-label="Next store"
                    >
                        →
                    </button>

                    {/* Dot indicators */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
                        {slugs.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setCurrent(i)}
                                className={`w-2 h-2 rounded-full transition-all duration-200 ${i === current
                                    ? "bg-foreground scale-125"
                                    : "bg-foreground/30 hover:bg-foreground/60"
                                    }`}
                                aria-label={`Go to store ${i + 1}`}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
