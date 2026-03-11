// Sign up form — collects store details, then redirects to Auth0
'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface SignUpFormProps {
  className?: string
  slug?: string
  onSwitch?: () => void
}

export function SignUpForm({ className, slug: prefillSlug, onSwitch }: SignUpFormProps) {
  const [storeName, setStoreName] = useState(prefillSlug ?? '')
  const router = useRouter()

  const derivedSlug = storeName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!storeName.trim()) return
    const state = btoa(JSON.stringify({ storeName, slug: derivedSlug }))
    router.push(`/auth/login?screen_hint=signup&state=${state}`)
  }

  return (
    <div className={cn('flex flex-col gap-5', className)}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="store-name" className="text-sm">Store name</Label>
          <div className="flex items-center border focus-within:ring-1 focus-within:ring-ring">
            <span className="pl-3 text-xs text-muted-foreground font-mono whitespace-nowrap">
              menengai.cloud/
            </span>
            <input
              id="store-name"
              type="text"
              placeholder="kikoskincare"
              required
              value={storeName}
              onChange={(e) => setStoreName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              className="flex-1 h-10 bg-transparent px-2 text-sm font-mono outline-none"
            />
          </div>
          {storeName && (
            <p className="text-xs text-muted-foreground font-mono">
              → {derivedSlug}.menengai.cloud
            </p>
          )}
        </div>

        <Button type="submit" className="w-full h-10 rounded-none google-button-primary mt-1">
          Claim your free store
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have a store?{' '}
        <button
          onClick={() => router.push('/auth/login')}
          className="text-foreground font-medium hover:underline underline-offset-4"
        >
          Sign in
        </button>
      </p>
    </div>
  )
}