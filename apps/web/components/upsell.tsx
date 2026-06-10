'use client'

import { useEffect, useState } from 'react'
import { motion, useScroll, useTransform, Variants } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Sparkles } from 'lucide-react'
import AuthPopup from "@/lib/auth"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'

// Determine which video to show based on day of year
const useAlternatingTheme = () => {
    const [theme, setTheme] = useState<'purple' | 'black'>('purple')

    useEffect(() => {
        const dayOfYear = Math.floor(
            (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
        )

        setTheme(dayOfYear % 2 === 0 ? 'black' : 'purple')
    }, [])

    return theme
}

export default function StreamerPackSection() {
    const [isAuthOpen, setIsAuthOpen] = useState(false);
    const theme = useAlternatingTheme()

    const videoConfig = {
        purple: {
            src: '/home-4096-2160.webm',
            accent: 'bg-indigo-600',
            accentHover: 'hover:bg-indigo-700',
            border: 'border-none',
            cardBg: 'bg-transparent',
            text: 'text-slate-400',
            badgeBg: 'bg-indigo-500/20',
            glow: 'shadow-none',
            dotColor: 'bg-indigo-400',
            buttonGradient: 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700'
        },
        black: {
            src: '/home-2-4096-2160.webm',
            accent: 'bg-neutral-700',
            accentHover: 'hover:bg-neutral-600',
            border: 'border-none',
            cardBg: 'bg-transparent',
            text: 'text-neutral-400',
            badgeBg: 'bg-neutral-700/20',
            glow: 'shadow-none',
            dotColor: 'bg-neutral-400',
            buttonGradient: 'bg-gradient-to-r from-neutral-700 to-neutral-600 hover:from-neutral-600 hover:to-neutral-500'
        }
    }

    const config = videoConfig[theme]

    // Stagger animation for feature items
    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.2
            }
        }
    }

    const itemVariants: Variants = {
        hidden: { opacity: 0, x: -20 },
        visible: {
            opacity: 1,
            x: 0,
            transition: {
                duration: 0.5,
                ease: [0.25, 0.46, 0.45, 0.94]
            }
        }
    }

    const features = [
        { title: '4K Streaming', subtitle: 'Up to 2160p quality' },
        { title: 'Zero Lag', subtitle: 'Ultra-low latency' },
        { title: 'Analytics', subtitle: 'Real-time insights' },
        { title: 'Global CDN', subtitle: 'Worldwide delivery' }
    ]

    return (
        <section className="container mx-auto">
            <div className="relative overflow-hidden h-[500px] md:h-[600px] lg:h-[700px]">
                {/* Video Background */}
                <motion.video
                    initial={{ scale: 1.1, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 1.2, ease: 'easeOut' }}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover"
                >
                    <source src={config.src} type="video/webm" />
                    Your browser does not support the video tag.
                </motion.video>

                {/* Gradient Overlay for Better Text Contrast */}
                <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-transparent to-black/60" />

                {/* Card with Entrance Animation */}
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{
                        duration: 0.7,
                        delay: 0.4,
                        ease: [0.25, 0.46, 0.45, 0.94]
                    }}
                    className="absolute bottom-0 right-0 w-full max-w-sm md:max-w-md pt-6 pl-6"
                >
                    <motion.div
                        whileHover={{ y: -4 }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                    >
                        <Card className={`${config.cardBg} ${config.border} ${config.glow} rounded-none overflow-hidden`}>
                            <CardHeader className="pb-3 space-y-2 hidden">
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.5, delay: 0.6 }}
                                >
                                    <Sparkles className="w-5 h-5 text-indigo-400 mb-2" />
                                </motion.div>
                                <CardTitle className="text-2xl md:text-3xl text-white font-montserrat">
                                    Own your platform
                                </CardTitle>
                            </CardHeader>

                            <CardContent className="space-y-5">
                                <motion.div
                                    variants={containerVariants}
                                    initial="hidden"
                                    animate="visible"
                                    className="space-y-4"
                                >
                                    {features.map((feature, index) => (
                                        <motion.div
                                            key={index}
                                            variants={itemVariants}
                                            whileHover={{ x: 4 }}
                                            className="flex items-start gap-3 group cursor-default"
                                        >
                                            <div className="flex-1">
                                                <div className="text-white font-semibold text-sm md:text-base transition-colors group-hover:text-indigo-300">
                                                    {feature.title}
                                                </div>
                                                <div className={`text-xs md:text-sm ${config.text} transition-colors group-hover:text-slate-300`}>
                                                    {feature.subtitle}
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </motion.div>

                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, delay: 1 }}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <Button
                                        size="lg"
                                        className={`w-full ${config.buttonGradient} text-white font-semibold shadow-lg transition-all duration-300 relative overflow-hidden group cursor-pointer`}
                                        onClick={() => setIsAuthOpen(true)}
                                    >
                                        <span className="relative z-10">Get Started</span>
                                        <motion.div
                                            className="absolute inset-0 bg-white/10"
                                            initial={{ x: '-100%' }}
                                            whileHover={{ x: '100%' }}
                                            transition={{ duration: 0.6, ease: 'easeInOut' }}
                                        />
                                    </Button>
                                </motion.div>
                            </CardContent>
                            {/* Auth Dialog */}
                            <Dialog open={isAuthOpen} onOpenChange={setIsAuthOpen}>
                                <DialogContent className="sm:max-w-md">
                                    <DialogHeader>
                                        <DialogTitle>Welcome to Menengai Cloud</DialogTitle>
                                    </DialogHeader>
                                    <AuthPopup />
                                </DialogContent>
                            </Dialog>
                        </Card>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    )
}
