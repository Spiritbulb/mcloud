'use client'

import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import AuthPopup from "@/lib/auth"

export function Header() {
    const [isAuthOpen, setIsAuthOpen] = useState(false)

    return (
        <>
            <header className="sticky top-0 z-50 w-full bg-background backdrop-blur supports-[backdrop-filter]:bg-background">
                <div className="container mx-auto px-6 md:px-12">
                    <div className="flex h-16 items-center justify-between">
                        {/* Logo */}
                        <Link href="/" className="flex items-center">
                            <img
                                src="/logo.png"
                                alt="Menengai Cloud"
                                className="w-20 h-auto"
                            />
                        </Link>

                        {/* CTA */}
                        <Button
                            className="google-button-primary px-6 h-10 text-sm cursor-pointer"
                            onClick={() => setIsAuthOpen(true)}
                        >
                            Get started
                        </Button>
                    </div>
                </div>
            </header>

            {/* Auth Dialog */}
            <Dialog open={isAuthOpen} onOpenChange={setIsAuthOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-center">We've been expecting you</DialogTitle>
                    </DialogHeader>
                    <AuthPopup />
                </DialogContent>
            </Dialog>
        </>
    )
}
