// Login form — strip it down, just triggers the redirect
'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function Form({ className, onSwitch }: { className?: string; onSwitch?: () => void }) {
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || ''

  return (
    <div className={cn('flex flex-col gap-5', className)}>
      <form action="/auth/login" method="GET" className="flex flex-col gap-4">
        <input type="hidden" name="returnTo" value={redirect || '/'} />
        <Button type="submit" className="w-full h-10 rounded-none google-button-primary">
          Get back in
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        Don't have an account?{' '}
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
  <Suspense fallback={<div className="h-12 flex items-center justify-center text-sm text-muted-foreground">Loading...</div>}>
    <Form onSwitch={onSwitch} />
  </Suspense>
)