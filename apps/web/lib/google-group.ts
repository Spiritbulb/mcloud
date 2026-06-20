import 'server-only'
import { createSign } from 'node:crypto'

// Adds an email as a member of a Google Group via the Admin SDK Directory API.
//
// Auth: a Google Cloud service account with domain-wide delegation. We mint a
// signed JWT ourselves (no `googleapis` dependency) and exchange it for an
// access token, impersonating a Workspace admin (GOOGLE_ADMIN_SUBJECT) who can
// manage group membership.
//
// Required env:
//   GOOGLE_SA_EMAIL       service account email (client_email from the JSON key)
//   GOOGLE_SA_PRIVATE_KEY service account private key (PEM, with real newlines
//                         or \n-escaped — both handled below)
//   GOOGLE_ADMIN_SUBJECT  a spiritbulb.org admin to impersonate
//   BETA_GROUP_EMAIL      group to add members to (e.g. beta@spiritbulb.org)
//
// The Directory API & domain-wide delegation are free; this introduces no
// billable Google service.

const SCOPE = 'https://www.googleapis.com/auth/admin.directory.group.member'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'

export type GroupAddResult =
    | { ok: true; alreadyMember: boolean }
    | { ok: false; error: string }

function base64url(input: Buffer | string): string {
    return Buffer.from(input)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '')
}

function getConfig() {
    const saEmail = process.env.GOOGLE_SA_EMAIL
    const rawKey = process.env.GOOGLE_SA_PRIVATE_KEY
    const subject = process.env.GOOGLE_ADMIN_SUBJECT
    const group = process.env.BETA_GROUP_EMAIL
    if (!saEmail || !rawKey || !subject || !group) return null
    // Allow the key to be stored with escaped newlines (common in .env files /
    // Vercel). Collapse double-escaped (\\n) first, then single (\n), so the PEM
    // ends up with real line breaks however the value was pasted.
    const privateKey = rawKey.replace(/\\\\n/g, '\n').replace(/\\n/g, '\n')
    return { saEmail, privateKey, subject, group }
}

export function isGoogleGroupConfigured(): boolean {
    return getConfig() !== null
}

async function getAccessToken(cfg: {
    saEmail: string
    privateKey: string
    subject: string
}): Promise<string> {
    const now = Math.floor(Date.now() / 1000)
    const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
    const claims = base64url(
        JSON.stringify({
            iss: cfg.saEmail,
            sub: cfg.subject, // impersonate the admin (domain-wide delegation)
            scope: SCOPE,
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
        const text = await res.text()
        throw new Error(`token exchange failed (${res.status}): ${text}`)
    }
    const json = (await res.json()) as { access_token?: string }
    if (!json.access_token) throw new Error('token exchange returned no access_token')
    return json.access_token
}

export async function addToBetaGroup(email: string): Promise<GroupAddResult> {
    const cfg = getConfig()
    if (!cfg) return { ok: false, error: 'Google group not configured' }

    try {
        const token = await getAccessToken(cfg)
        const url = `https://admin.googleapis.com/admin/directory/v1/groups/${encodeURIComponent(
            cfg.group
        )}/members`
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, role: 'MEMBER', delivery_settings: 'ALL_MAIL' }),
        })

        if (res.ok) return { ok: true, alreadyMember: false }
        // 409 = already a member → success for our purposes.
        if (res.status === 409) return { ok: true, alreadyMember: true }
        const text = await res.text()
        return { ok: false, error: `directory insert failed (${res.status}): ${text}` }
    } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : String(e) }
    }
}
