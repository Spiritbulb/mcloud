'use client'

import { useState, useRef } from "react"
import { motion, useInView, AnimatePresence } from "framer-motion"
import type { Variants } from "framer-motion"
import { Search, Mail } from "lucide-react"

// Assuming Button component exists. If not, this might need an update.
import { Button } from "@/components/ui/button"

const fadeUp: Variants = {
    hidden: { opacity: 0, y: 32 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.25, 0.1, 0.25, 1] } },
}

const staggerContainer: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.12 } },
}

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

function FaqItem({ q, a }: { q: string; a: string }) {
    const [open, setOpen] = useState(false)
    return (
        <div
            className="border-b border-border py-5 cursor-pointer"
            onClick={() => setOpen(!open)}
        >
            <div className="flex items-center justify-between gap-4">
                <p className="text-body-large font-medium text-foreground">{q}</p>
                <motion.span
                    animate={{ rotate: open ? 45 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-2xl text-muted-foreground flex-shrink-0 leading-none"
                >
                    +
                </motion.span>
            </div>
            <AnimatePresence initial={false}>
                {open && (
                    <motion.p
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="text-body-medium text-muted-foreground mt-3 overflow-hidden"
                    >
                        {a}
                    </motion.p>
                )}
            </AnimatePresence>
        </div>
    )
}

const faqs = [
    {
        q: "How do I connect a custom domain?",
        a: "To connect a custom domain, you need to upgrade to Pro. Once upgraded, go to your store settings, enter your domain, and follow the instructions to configure your DNS records.",
    },
    {
        q: "Can I manage multiple stores with one account?",
        a: "Currently, each account is tied to a single store. If you need to manage multiple stores, you'll need to create separate accounts for each one.",
    },
    {
        q: "What payment methods are supported?",
        a: "We support integrations with M-Pesa natively, along with generic card payments via Stripe and Flutterwave. You can enable these in your dashboard under Settings > Payments.",
    },
    {
        q: "Is there a limit on how many products I can add?",
        a: "No! Even on the free plan, you can add unlimited products to your store.",
    },
    {
        q: "I forgot my password. How do I reset it?",
        a: "Click 'Forgot Password' on the login screen, enter your email address, and we'll send you a link to reset your password immediately.",
    },
    {
        q: "Can I import products from Shopify or WooCommerce?",
        a: "Yes. Reach out to our support team and we will help you migrate your content manually at no extra cost.",
    }
]

const commonIssues = [
    {
        title: "Domain not connecting",
        description: "DNS propagation can take up to 48 hours. Ensure you've added the correct A and CNAME records as listed in your dashboard."
    },
    {
        title: "Not receiving emails",
        description: "Check your spam folder and ensure no-reply@menengai.cloud is added to your safe sender list."
    },
    {
        title: "M-Pesa integration failing",
        description: "Make sure you've correctly entered your Till/Paybill number and verified the callback URLs in the developer portal."
    }
]

export default function SupportClient() {
    const [searchQuery, setSearchQuery] = useState("")

    const filteredFaqs = faqs.filter(faq =>
        faq.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.a.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="min-h-screen bg-background overflow-x-hidden pb-0">
            {/* HERO SECTION */}
            <section className="relative pt-32 pb-16 bg-background">
                <div className="container mx-auto px-6 md:px-12 max-w-4xl text-center">
                    <motion.div
                        variants={staggerContainer}
                        initial="hidden"
                        animate="visible"
                        className="space-y-6"
                    >
                        <motion.h1
                            variants={fadeUp}
                            className="text-5xl md:text-6xl font-montserrat font-bold text-foreground leading-[1.05]"
                        >
                            How can we help?
                        </motion.h1>
                        <motion.p
                            variants={fadeUp}
                            className="text-body-large text-muted-foreground mx-auto max-w-2xl"
                        >
                            Search our knowledge base or get in touch with our team if you can't find what you're looking for.
                        </motion.p>

                        <motion.div variants={fadeUp} className="relative max-w-xl mx-auto mt-8">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Search className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search for answers..."
                                className="block w-full pl-11 pr-4 py-4 border border-border bg-card text-foreground rounded-full outline-none focus:ring-2 focus:ring-primary shadow-sm text-body-medium transition-all"
                            />
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* COMMON ISSUES SECTION */}
            {!searchQuery && (
                <section className="bg-secondary py-20">
                    <div className="container mx-auto px-6 md:px-12 max-w-6xl">
                        <FadeIn className="text-center mb-12">
                            <h2 className="text-3xl font-montserrat font-bold text-foreground">
                                Common Issues
                            </h2>
                            <p className="text-body-medium text-muted-foreground mt-2">Quick answers to frequent problems</p>
                        </FadeIn>

                        <div className="grid md:grid-cols-3 gap-8">
                            {commonIssues.map((issue, i) => (
                                <FadeIn key={i} delay={i * 0.1}>
                                    <div className="bg-background border border-border p-6 rounded-2xl h-full hover:shadow-md transition-shadow">
                                        <h3 className="text-xl font-montserrat font-semibold text-foreground mb-3">{issue.title}</h3>
                                        <p className="text-body-medium text-muted-foreground">{issue.description}</p>
                                    </div>
                                </FadeIn>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* FAQs SECTION */}
            <section className="bg-background py-20">
                <div className="container mx-auto px-6 md:px-12 max-w-4xl">
                    <FadeIn className="mb-10 text-center">
                        <h2 className="text-3xl font-montserrat font-bold text-foreground">
                            {searchQuery ? "Search Results" : "Frequently Asked Questions"}
                        </h2>
                    </FadeIn>

                    <FadeIn>
                        {filteredFaqs.length > 0 ? (
                            <div className="space-y-2">
                                {filteredFaqs.map((faq, i) => (
                                    <FaqItem key={i} q={faq.q} a={faq.a} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 border border-border rounded-xl bg-card">
                                <p className="text-body-large text-muted-foreground">No FAQs found matching "{searchQuery}".</p>
                                <Button
                                    variant="outline"
                                    className="mt-4 border border-border rounded-full hover:bg-secondary transition-colors"
                                    onClick={() => setSearchQuery("")}
                                >
                                    Clear search
                                </Button>
                            </div>
                        )}
                    </FadeIn>
                </div>
            </section>

            {/* CONTACT SECTION */}
            <section className="dark-section py-24 text-center">
                <div className="container mx-auto px-6 md:px-12 max-w-3xl">
                    <FadeIn>
                        <h2 className="text-4xl md:text-5xl font-montserrat font-bold text-on-dark mb-6">
                            Still need help?
                        </h2>
                        <p className="text-on-dark-secondary text-body-large mb-10">
                            Our support team is always ready to assist you. Send us an email and we'll get back to you within 24 hours.
                        </p>
                        <a
                            href="mailto:support@menengai.cloud"
                            className="inline-flex items-center justify-center rounded-full bg-[#425e7b] hover:bg-[#425e7b]/90 text-white px-8 py-4 text-body-large font-medium transition-all"
                        >
                            Contact us
                        </a>
                    </FadeIn>
                </div>
            </section>
        </div>
    )
}
