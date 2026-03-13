'use client'

import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"

type Sticker = { src: string; x: string; y: string; delay: number; duration: number }

const stickers: Sticker[] = [
    { src: "https://img.icons8.com/3d-fluency/94/sparkling-1.png", x: "8%", y: "15%", delay: 0, duration: 6 },
    { src: "https://img.icons8.com/3d-fluency/94/bank-card-back-side.png", x: "85%", y: "12%", delay: 0.5, duration: 7 },
    { src: "https://img.icons8.com/3d-fluency/94/movie-video-camera.png", x: "80%", y: "68%", delay: 1, duration: 5 },
]

function FloatingStickerImage({ s }: { s: Sticker }) {
    return (
        <motion.div
            className="absolute select-none pointer-events-none z-10"
            style={{ left: s.x, top: s.y }}
            animate={{ y: [0, -14, 0], rotate: [-3, 3, -3] }}
            transition={{ duration: s.duration, delay: s.delay, repeat: Infinity, ease: "easeInOut" }}
        >
            <Image src={s.src} alt="" width={48} height={48} className="drop-shadow-xl" unoptimized />
        </motion.div>
    )
}

export default function NotFound() {
    const router = useRouter()

    return (
        <section className="dark-section relative min-h-screen flex items-center justify-center overflow-hidden">
            {stickers.map((s, i) => (
                <FloatingStickerImage key={i} s={s} />
            ))}

            {/* Dot grid — same as hero */}
            <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)",
                    backgroundSize: "28px 28px",
                }}
            />

            <div className="relative z-20 container mx-auto px-6 md:px-12 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 32 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55, ease: [0.25, 0.1, 0.25, 1] }}
                    className="space-y-6"
                >
                    {/* Big 404 */}
                    <p className="text-[10rem] md:text-[14rem] font-montserrat font-bold text-on-dark leading-none opacity-10 select-none">
                        404
                    </p>

                    {/* Pulled up over the 404 */}
                    <div className="-mt-16 md:-mt-24 space-y-4">
                        <h1 className="text-4xl md:text-6xl font-montserrat font-bold text-on-dark">
                            Nothing to see here.
                        </h1>
                        <p className="text-on-dark-secondary text-body-large max-w-md mx-auto">
                            Sometimes it's just that kind of day. <br /> Maybe we can help;
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                        <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                            <Button
                                className="bg-[#425e7b] hover:bg-[#425e7b]/90 text-white px-10 py-2 text-base h-auto rounded-full cursor-pointer"
                                onClick={() => router.push('/')}
                            >
                                Go home
                                <ArrowRight className="ml-2 w-5 h-5" />
                            </Button>
                        </motion.div>
                        <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                            <Button
                                variant="outline"
                                className="border-on-dark/20 text-on-dark bg-transparent hover:bg-on-dark/5 px-6 py-2 text-base h-auto rounded-full cursor-pointer"
                                onClick={() => router.back()}
                            >
                                Go back
                            </Button>
                        </motion.div>
                    </div>

                    <p className="text-on-dark-muted text-body-small pt-2">
                        Is this a glitch? Report it {" "}
                        <a href="/support" className="text-on-dark underline underline-offset-4 hover:opacity-80 transition-opacity">
                            here
                        </a>
                    </p>
                </motion.div>
            </div>
        </section>
    )
}
