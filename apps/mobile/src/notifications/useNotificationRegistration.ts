// Registers for push once per session after the user is authenticated. The first
// permission prompt fires inside the app (after sign-in), not on cold launch.
import * as React from 'react'
import { useAuth } from '@/auth/AuthContext'
import { registerPush } from './registerPush'
import * as Notifications from 'expo-notifications'
import { useRouter } from 'expo-router'



export function useNotificationRegistration() {
  const { user, authedFetch } = useAuth()
  const ran = React.useRef(false)
  React.useEffect(() => {
    if (!user || ran.current) return
    ran.current = true
    registerPush(authedFetch)
      .then((result) => { if (__DEV__) console.log('[push] registration result:', result) })
      .catch(() => {}) // fire-and-forget; never block UI
  }, [user, authedFetch])
}

export function useNotificationTapRouting() {
  const router = useRouter()
 
  React.useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as { storeSlug?: string } | undefined
      if (data?.storeSlug) {
        router.push(`/store/${data.storeSlug}` as never)
      }
    })
    return () => sub.remove()
  }, [router])
}
