'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

function Form({ className, onSwitch }: { className?: string; onSwitch?: () => void }) {
  return (
    <div className={cn('flex flex-col gap-5', className)}>
      <a href="/auth/login">
        <Button className="w-full h-10 rounded-none google-button-primary">
          Get back in
        </Button>
      </a>
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
  <Form onSwitch={onSwitch} />
)
