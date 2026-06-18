// Registers for push once per session after the user is authenticated. The first
// permission prompt fires inside the app (after sign-in), not on cold launch.
import * as React from 'react'
import { useAuth } from '@/auth/AuthContext'
import { registerPush } from './registerPush'

export function useNotificationRegistration() {
  const { user, authedFetch } = useAuth()
  const ran = React.useRef(false)
  React.useEffect(() => {
    if (!user || ran.current) return
    ran.current = true
    registerPush(authedFetch).catch(() => {}) // fire-and-forget; never block UI
  }, [user, authedFetch])
}
