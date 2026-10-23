'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { isTrackablePath } from '@/lib/analytics-logic'
import { hasAnsweredConsent, setAnalyticsConsent } from '@/lib/analytics'

export function CookieBanner() {
    const [visible, setVisible] = useState(false)
    const pathname = usePathname()

    useEffect(() => {
        if (!hasAnsweredConsent()) setVisible(true)
    }, [])

    // Only where analytics actually runs: not in the admin, the auth screens or invite links.
    if (!isTrackablePath(pathname)) return null

    const answer = (choice: 'granted' | 'denied') => {
        setAnalyticsConsent(choice)
        setVisible(false)
    }

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ y: 80, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 80, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                    className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100%-2rem)] max-w-xl"
                >
                    <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#0a0a0a]/95 backdrop-blur-md px-5 py-4 shadow-2xl">
                        <p className="text-[12px] text-white/60 leading-relaxed">
                            We use analytics cookies to see which pages are useful. You can decline; the site works the same.{' '}
                            <a href="https://spiritb.uk/privacy" className="text-white/80 underline underline-offset-2 hover:text-white transition-colors">
                                Cookie policy
                            </a>
                            .
                        </p>
                        <div className="flex shrink-0 items-center gap-2">
                            <button
                                onClick={() => answer('denied')}
                                className="h-8 px-3 rounded-full text-white/70 text-[12px] font-medium hover:text-white transition-colors"
                            >
                                Decline
                            </button>
                            <button
                                onClick={() => answer('granted')}
                                className="h-8 px-4 rounded-full bg-white text-[#0a0a0a] text-[12px] font-semibold hover:bg-white/90 active:scale-[0.97] transition-all"
                            >
                                Accept
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
