import 'server-only'
import { getGoogleAccessToken, normalizePrivateKey } from './google-jwt'

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

export type GroupAddResult =
    | { ok: true; alreadyMember: boolean }
    | { ok: false; error: string }

function getConfig() {
    const saEmail = process.env.GOOGLE_SA_EMAIL
    const rawKey = process.env.GOOGLE_SA_PRIVATE_KEY
    const subject = process.env.GOOGLE_ADMIN_SUBJECT
    const group = process.env.BETA_GROUP_EMAIL
    if (!saEmail || !rawKey || !subject || !group) return null
    return { saEmail, privateKey: normalizePrivateKey(rawKey), subject, group }
}

export function isGoogleGroupConfigured(): boolean {
    return getConfig() !== null
}

export async function addToBetaGroup(email: string): Promise<GroupAddResult> {
    const cfg = getConfig()
    if (!cfg) return { ok: false, error: 'Google group not configured' }

    try {
        const token = await getGoogleAccessToken({
            saEmail: cfg.saEmail,
            privateKey: cfg.privateKey,
            scope: SCOPE,
            subject: cfg.subject, // impersonate the admin (domain-wide delegation)
        })
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
