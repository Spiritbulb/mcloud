'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const KEY = 'mng_cookie_ok'

export function CookieBanner() {
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        if (!localStorage.getItem(KEY)) setVisible(true)
    }, [])

    const dismiss = () => {
        localStorage.setItem(KEY, '1')
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
                            We use cookies to improve your experience. By using Menengai Cloud you agree to our{' '}
                            <a href="https://spiritb.uk/privacy" className="text-white/80 underline underline-offset-2 hover:text-white transition-colors">
                                cookie policy
                            </a>
                            .
                        </p>
                        <button
                            onClick={dismiss}
                            className="shrink-0 h-8 px-4 rounded-full bg-white text-[#0a0a0a] text-[12px] font-semibold hover:bg-white/90 active:scale-[0.97] transition-all"
                        >
                            I understand
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
