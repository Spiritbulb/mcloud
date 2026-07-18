// Runtime config, read from app.json `extra`. Override per-environment via
// EAS env or a local app.config.js later. WorkOS client id is required for login.
import Constants from 'expo-constants'

type Extra = {
  apiBaseUrl?: string
  webBaseUrl?: string
  workosClientId?: string
  workosDomain?: string
  reviewEmail?: string
}

const extra = (Constants.expoConfig?.extra ?? {}) as Extra

export const config = {
  /** Base URL of apps/web, which hosts /api/mobile/* and the deep-link targets. */
  apiBaseUrl: extra.apiBaseUrl ?? 'http://localhost:3000',
  webBaseUrl: extra.webBaseUrl ?? 'http://localhost:3000',
  /** WorkOS AuthKit OAuth client id (public). */
  workosClientId: extra.workosClientId ?? '',
  workosDomain: extra.workosDomain ?? 'https://api.workos.com',
  /**
   * App-store review account email (NOT secret). When the login screen sees this
   * exact email it reveals a password field and signs in by password instead of
   * a magic code, because reviewers cannot receive the emailed code. Empty for
   * everyone else, so the field never appears. The password lives only in the
   * server env, never here.
   */
  reviewEmail: (extra.reviewEmail ?? '').trim().toLowerCase(),
}
