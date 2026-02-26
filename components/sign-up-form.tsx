'use client'

import { cn } from '@/lib/utils'
import { createClient } from '@/lib/client'
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

const generateSlug = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

export function SignUpForm({ className, slug: prefillSlug, onSwitch }: SignUpFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [repeatPassword, setRepeatPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [storeName, setStoreName] = useState(prefillSlug ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const derivedSlug = generateSlug(storeName)

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    if (password !== repeatPassword) {
      setError('Passwords do not match')
      setIsLoading(false)
      return
    }

    if (!storeName.trim()) {
      setError('Store name is required')
      setIsLoading(false)
      return
    }

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: { full_name: fullName, slug: derivedSlug },
        },
      })
      if (authError) throw authError
      if (!authData.user) throw new Error('User creation failed')

      // Check slug availability
      const { data: existingStore } = await supabase
        .from('stores')
        .select('slug')
        .eq('slug', derivedSlug)
        .single()

      const finalSlug = existingStore
        ? `${derivedSlug}-${Math.floor(Math.random() * 10000)}`
        : derivedSlug

      // 1. Create store
      const { error: storeError } = await supabase
        .from('stores')
        .insert({
          name: storeName,
          slug: finalSlug,
          owner_id: authData.user.id,
          currency: 'KES',
          timezone: 'Africa/Nairobi',
          is_active: true,
        })
      if (storeError) throw storeError

      // 2. Add owner to store_members
      const { data: store } = await supabase
        .from('stores')
        .select('id')
        .eq('slug', finalSlug)
        .single()

      const { error: memberError } = await supabase
        .from('store_members')
        .insert({
          store_id: store!.id,
          user_id: authData.user.id,
          role: 'owner',
        })
      if (memberError) throw memberError

      router.push('/auth/sign-up-success')
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }


  }

  return (
    <div className={cn('flex flex-col gap-5', className)}>
      <form onSubmit={handleSignUp} className="flex flex-col gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="full-name" className="text-sm">Full name</Label>
          <Input
            id="full-name"
            type="text"
            placeholder="Amina Wanjiru"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="h-10 rounded-none"
          />
        </div>

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

        <div className="grid gap-1.5">
          <Label htmlFor="signup-email" className="text-sm">Email</Label>
          <Input
            id="signup-email"
            type="email"
            placeholder="you@example.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-10 rounded-none"
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="signup-password" className="text-sm">Password</Label>
          <Input
            id="signup-password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-10 rounded-none"
          />
          <p className="text-xs text-muted-foreground">At least 6 characters</p>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="repeat-password" className="text-sm">Confirm password</Label>
          <Input
            id="repeat-password"
            type="password"
            required
            value={repeatPassword}
            onChange={(e) => setRepeatPassword(e.target.value)}
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
              Creating your store...
            </span>
          ) : (
            "Claim your free store"
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have a store?{" "}
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
