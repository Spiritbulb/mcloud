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
import { useRouter } from "next/navigation"

interface HeaderProps {
    isLoggedIn?: boolean
}

export function Header({ isLoggedIn = false }: HeaderProps) {
    const router = useRouter()

    return (
        <>
            <header className="sticky top-5 z-50 w-[85%] mx-auto rounded-full bg-[#fff]/80 dark:bg-[#000]/80 backdrop-blur">
                <div className="container mx-auto px-2 md:px-4">
                    <div className="flex h-16 items-center justify-between">
                        {/* Logo */}
                        <Link href="/" className="flex items-center">
                            <img src="/favicon.ico" alt="Menengai Cloud" className="w-10 h-auto" />
                        </Link>

                        {/* CTA — conditional */}
                        {isLoggedIn ? (
                            <Button asChild className="bg-[#425e7b] hover:bg-[#425e7b]/90 text-white px-6 h-10 text-sm cursor-pointer rounded-full">
                                <Link href="/settings">Go to dashboard</Link>
                            </Button>
                        ) : (
                            <Button
                                className="bg-[#425e7b] hover:bg-[#425e7b]/90 text-white px-6 h-10 text-sm cursor-pointer rounded-full"
                                onClick={() => router.push('/auth/sign-up')}
                            >
                                Get started
                            </Button>
                        )}
                    </div>
                </div>
            </header>
        </>
    )
}
