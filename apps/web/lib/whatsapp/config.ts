// WhatsApp Cloud API settings, read at runtime (never at build time, so turbo.json is unchanged).
// Names only in docs/environment.md; values live in the environment.

export interface WhatsAppConfig {
    token: string
    phoneNumberId: string
    appSecret: string
    verifyToken: string
    /** Display number (e.g. +254...) used in "send LINK ... to" copy. Optional. */
    businessNumber: string | null
}

/** All four secrets are required; without them the integration is off rather than half-working. */
export function getWhatsAppConfig(): WhatsAppConfig | null {
    const token = process.env.WHATSAPP_ACCESS_TOKEN
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
    const appSecret = process.env.WHATSAPP_APP_SECRET
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN
    if (!token || !phoneNumberId || !appSecret || !verifyToken) return null
    return { token, phoneNumberId, appSecret, verifyToken, businessNumber: process.env.WHATSAPP_BUSINESS_NUMBER || null }
}

/** `+254 700 000 000` -> `254700000000`, for wa.me links. */
export function waMeDigits(display: string | null): string | null {
    const d = display?.replace(/\D/g, '') ?? ''
    return d.length >= 8 ? d : null
}
