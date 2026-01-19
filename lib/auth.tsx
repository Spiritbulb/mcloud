'use client'

import { SignUpForm } from "@/components/sign-up-form"
import { LoginForm } from "@/components/login-form"
import { useState } from "react"
import { Button } from "@/components/ui/button"

export default function AuthPopup() {
    const [isLogin, setIsLogin] = useState(true);

    return (
        <div className="w-full max-w-md mx-auto">
            {/* Toggle buttons */}
            <div className="flex gap-2 mb-4">
                <Button
                    variant={isLogin ? "default" : "outline"}
                    onClick={() => setIsLogin(true)}
                    className="flex-1"
                >
                    Login
                </Button>
                <Button
                    variant={!isLogin ? "default" : "outline"}
                    onClick={() => setIsLogin(false)}
                    className="flex-1"
                >
                    Sign Up
                </Button>
            </div>

            {/* Show the appropriate form */}
            {isLogin ? <LoginForm /> : <SignUpForm />}
        </div>
    )
}