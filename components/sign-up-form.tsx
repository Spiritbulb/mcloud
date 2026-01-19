'use client'

import { cn } from '@/lib/utils'
import { createClient } from '@/lib/client'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function SignUpForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [repeatPassword, setRepeatPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

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

    if (!companyName.trim()) {
      setError('Company name is required')
      setIsLoading(false)
      return
    }

    try {
      // 1. Sign up the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('User creation failed')

      // 2. Create organization
      const slug = generateSlug(companyName)

      // Check if slug exists
      const { data: existingOrg } = await supabase
        .from('organizations')
        .select('slug')
        .eq('slug', slug)
        .single()

      let finalSlug = slug
      if (existingOrg) {
        // Add random number if slug exists
        finalSlug = `${slug}-${Math.floor(Math.random() * 10000)}`
      }

      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: companyName,
          slug: finalSlug,
          owner_id: authData.user.id,
        })
        .select()
        .single()

      if (orgError) throw orgError

      // 3. Update user profile with organization
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          organization_id: org.id,
          full_name: fullName,
          company: companyName,
        })
        .eq('id', authData.user.id)

      if (profileError) throw profileError

      // 4. Add user as owner in team_members
      const { error: teamError } = await supabase
        .from('team_members')
        .insert({
          organization_id: org.id,
          user_id: authData.user.id,
          role: 'owner',
          status: 'active',
          joined_at: new Date().toISOString(),
        })

      if (teamError) throw teamError

      // 5. Redirect to organization dashboard or success page
      if (authData.user.confirmed_at) {
        // User is auto-confirmed, redirect to dashboard
        router.push(`/${finalSlug}`)
      } else {
        // User needs to verify email
        router.push('/auth/sign-up-success')
      }
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Sign up</CardTitle>
          <CardDescription>Create a new account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="full-name">Full Name</Label>
                <Input
                  id="full-name"
                  type="text"
                  placeholder="John Doe"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="company-name">Company Name</Label>
                <Input
                  id="company-name"
                  type="text"
                  placeholder="Spiritbulb LTD"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
                {companyName && (
                  <p className="text-xs text-on-surface-variant">
                    Your URL will be: {window.location.origin}/{generateSlug(companyName)}
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <p className="text-xs text-on-surface-variant">
                  At least 6 characters
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="repeat-password">Repeat Password</Label>
                <Input
                  id="repeat-password"
                  type="password"
                  required
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                />
              </div>

              {error && <p className="text-sm text-on-surface-variant">{error}</p>}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Creating account...' : 'Sign up'}
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              Already have an account?{' '}
              <Link href="/auth/login" className="underline underline-offset-4">
                Login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
