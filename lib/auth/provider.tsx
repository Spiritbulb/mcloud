'use client'
// lib/auth/provider.tsx
// Client-side auth context provider for the active provider. Keep this in lockstep
// with lib/auth/index.ts. WorkOS's AuthKitProvider enables client-side session
// refresh / useAuth(); no app code currently consumes it, but it's the correct wrapper.
import { AuthKitProvider } from '@workos-inc/authkit-nextjs/components'

export function AuthProvider({ children }: { children: React.ReactNode }) {
    return <AuthKitProvider>{children}</AuthKitProvider>
}
