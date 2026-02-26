'use client'

import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"

interface AuthPopupProps {
    slug?: string
}

export default function AuthPopup({ slug }: AuthPopupProps) {
    const router = useRouter()

    const handleSignUp = () => {
        const params = slug ? `?slug=${slug}` : ''
        router.push(`/auth/sign-up${params}`)
    }

    const handleLogin = () => {
        router.push('/auth/login')
    }

    return (
        <div className="flex flex-col gap-3 pt-2">
            <Button
                className="w-full h-11 rounded-none google-button-primary cursor-pointer"
                onClick={handleSignUp}
            >
                Claim your free store
                <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
            <Button
                variant="ghost"
                className="w-full h-11 rounded-none cursor-pointer"
                onClick={handleLogin}
            >
                I already have an account
            </Button>
        </div>
    )
}
