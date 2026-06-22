import 'server-only'
import { createSign } from 'node:crypto'
import { base64url, normalizePrivateKey } from './google-jwt-pure'

// Shared Google service-account JWT → access-token helper. Mints a signed JWT
// ourselves (no `googleapis` dependency) and exchanges it for an access token.
// `subject` is only for domain-wide-delegation APIs (e.g. Admin SDK Directory);
// omit it for service-account-as-self APIs (e.g. Android Publisher).

export { normalizePrivateKey }

const TOKEN_URL = 'https://oauth2.googleapis.com/token'

export async function getGoogleAccessToken(cfg: {
    saEmail: string
    privateKey: string
    scope: string
    subject?: string
}): Promise<string> {
    const now = Math.floor(Date.now() / 1000)
    const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
    const claims = base64url(
        JSON.stringify({
            iss: cfg.saEmail,
            ...(cfg.subject ? { sub: cfg.subject } : {}),
            scope: cfg.scope,
            aud: TOKEN_URL,
            iat: now,
            exp: now + 3600,
        })
    )
    const signingInput = `${header}.${claims}`
    const signature = base64url(
        createSign('RSA-SHA256').update(signingInput).sign(cfg.privateKey)
    )
    const assertion = `${signingInput}.${signature}`

    const res = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion,
        }),
    })
    if (!res.ok) {
        throw new Error(`token exchange failed (${res.status}): ${await res.text()}`)
    }
    const json = (await res.json()) as { access_token?: string }
    if (!json.access_token) throw new Error('token exchange returned no access_token')
    return json.access_token
}
