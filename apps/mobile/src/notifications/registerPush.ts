// Request notification permission, get the Expo push token, and POST it to the
// backend. Returns a status so callers (after-sign-in hook, settings toggle) react.
// Safe to call repeatedly — Expo returns the same token for a device.
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform } from 'react-native'
import Constants from 'expo-constants'

type Fetch = (path: string, init?: RequestInit) => Promise<Response>
export type PushRegisterResult = 'registered' | 'denied' | 'unsupported' | 'error'

export async function registerPush(authedFetch: Fetch): Promise<PushRegisterResult> {
  if (!Device.isDevice) return 'unsupported' // simulators can't get a token

  const existing = await Notifications.getPermissionsAsync()
  let status = existing.status
  if (status !== 'granted') {
    status = (await Notifications.requestPermissionsAsync()).status
  }
  if (status !== 'granted') return 'denied'

  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId
    const tokenResp = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    )
    const res = await authedFetch('/api/mobile/push-token', {
      method: 'POST',
      body: JSON.stringify({ token: tokenResp.data, platform: Platform.OS }),
    })
    if (!res.ok) return 'error'
    return 'registered'
  } catch {
    return 'error'
  }
}
