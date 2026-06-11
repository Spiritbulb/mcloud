// Runtime config, read from app.json `extra`. Override per-environment via
// EAS env or a local app.config.js later. WorkOS client id is required for login.
import Constants from 'expo-constants'

type Extra = {
  apiBaseUrl?: string
  webBaseUrl?: string
  workosClientId?: string
  workosDomain?: string
}

const extra = (Constants.expoConfig?.extra ?? {}) as Extra

export const config = {
  /** Base URL of apps/web, which hosts /api/mobile/* and the deep-link targets. */
  apiBaseUrl: extra.apiBaseUrl ?? 'http://localhost:3000',
  webBaseUrl: extra.webBaseUrl ?? 'http://localhost:3000',
  /** WorkOS AuthKit OAuth client id (public). */
  workosClientId: extra.workosClientId ?? '',
  workosDomain: extra.workosDomain ?? 'https://api.workos.com',
}
