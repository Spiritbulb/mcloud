'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, Suspense } from 'react'
import { loginAction } from '@/app/auth/actions'

interface LoginFormProps {
  className?: string
  onSwitch?: () => void
}

function Form({ className, onSwitch }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData()
    formData.append('email', email)
    formData.append('password', password)
    formData.append('redirect', searchParams.get('redirect') || '')

    try {
      const result = await loginAction(formData)
      if (result.error) {
        setError(result.error)
        setIsLoading(false)
      } else if (result.success && result.destination) {
        window.location.href = result.destination
      }
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred')
      setIsLoading(false)
    }
  }

  return (
    <div className={cn('flex flex-col gap-5', className)}>
      <form onSubmit={handleLogin} className="flex flex-col gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="login-email" className="text-sm">Email</Label>
          <Input
            id="login-email"
            type="email"
            placeholder="you@example.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-10 rounded-none"
          />
        </div>

        <div className="grid gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="login-password" className="text-sm">Password</Label>
            <a
              href="/auth/forgot-password"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Forgot password?
            </a>
          </div>
          <Input
            id="login-password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-10 rounded-none"
          />
        </div>

        {error && (
          <p className="text-xs text-destructive bg-destructive/10 px-3 py-2">{error}</p>
        )}

        <Button
          type="submit"
          className="w-full h-10 rounded-none google-button-primary mt-1"
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Signing in...
            </span>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Don't have an account?{" "}
        <button
          onClick={onSwitch}
          className="text-foreground font-medium hover:underline underline-offset-4"
        >
          Get started free
        </button>
      </p>
    </div>
  )
}

export const LoginForm = ({ onSwitch }: { onSwitch?: () => void }) => (
  <Suspense fallback={<div className="h-48 flex items-center justify-center text-sm text-muted-foreground">Loading...</div>}>
    <Form onSwitch={onSwitch} />
  </Suspense>
)
