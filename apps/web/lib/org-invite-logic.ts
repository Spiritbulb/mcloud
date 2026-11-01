// Org invite rules, shared by the Members page (status badges) and the accept page.
// Pure so they can be tested.

export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000

export type OrgInviteLike = {
    email: string | null
    expires_at: string | null
    accepted_at: string | null
    token?: string | null
}

export type InviteStatus = 'pending' | 'accepted' | 'expired' | 'broken'

/** `broken`: created before invites had tokens (the link in that email cannot work). */
export function inviteStatus(invite: OrgInviteLike, now: number = Date.now()): InviteStatus {
    if (invite.accepted_at) return 'accepted'
    if (invite.token === null) return 'broken'
    if (!invite.expires_at || Date.parse(invite.expires_at) <= now) return 'expired'
    return 'pending'
}

export type AcceptCheck =
    | { ok: true }
    | { ok: false; reason: 'not_found' | 'accepted' | 'expired' }
    | { ok: false; reason: 'wrong_account'; invitedEmail: string }

/**
 * Whether the signed-in person may accept this invite. The link alone is not enough: it is
 * bound to the address it was sent to, so a forwarded or leaked link cannot add a stranger.
 */
export function checkAccept(invite: OrgInviteLike | null, sessionEmail: string | null | undefined, now: number = Date.now()): AcceptCheck {
    if (!invite) return { ok: false, reason: 'not_found' }
    const status = inviteStatus(invite, now)
    if (status === 'accepted') return { ok: false, reason: 'accepted' }
    if (status !== 'pending') return { ok: false, reason: 'expired' }
    const invited = (invite.email ?? '').trim().toLowerCase()
    if (!invited || invited !== (sessionEmail ?? '').trim().toLowerCase()) {
        return { ok: false, reason: 'wrong_account', invitedEmail: invite.email ?? '' }
    }
    return { ok: true }
}
