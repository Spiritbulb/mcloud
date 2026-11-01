// This app's public origin, for absolute links that leave the browser (emails).
// NEXT_PUBLIC_APP_URL overrides it, e.g. http://localhost:3000 in development.
export const WEB_ORIGIN = (process.env.NEXT_PUBLIC_APP_URL || 'https://www.mcloud.co.ke').replace(/\/+$/, '')
