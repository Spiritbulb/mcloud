// Pure identity mapping for the WorkOS provider. Kept free of AuthKit, next and
// jose so it runs (and is tested) in plain Node.
import type { AuthUser } from '../types'

// Structural shape of the WorkOS user fields we consume. Typed locally (rather than
// importing @workos-inc/node's User) because AuthKit bundles its own SDK version,
// and `name` only exists on newer versions — so we read it optionally.
export type WorkOSUserish = {
    id: string
    email: string
    firstName?: string | null
    lastName?: string | null
    name?: string | null
    profilePictureUrl?: string | null
    externalId?: string | null
    /** Set by ensureLinked when linking FAILED (not "nothing to link"): identity is unresolved. */
    linkFailed?: boolean
}

/** Resolves a WorkOS user to its linked identity (e.g. sets externalId from a legacy row). */
export type Linker = (u: WorkOSUserish) => Promise<WorkOSUserish>

/**
 * How a provider instance resolves identity.
 * - `link`: optional linker run at every session resolution (legacy Auth0 linking).
 * - `canonicalId`: `external` prefers the WorkOS externalId as AuthUser.id (web,
 *   storefront); `workos` always uses the WorkOS user id (standalone apps).
 */
export type IdentityOptions = { link?: Linker; canonicalId: 'external' | 'workos' }

/**
 * Map a WorkOS user onto our provider-agnostic AuthUser.
 *
 * IDENTITY CONTINUITY SEAM (Phase 2b — decided live): existing DB rows key on the
 * Auth0 `sub` (`auth0|...`). We prefer the WorkOS `externalId` as the canonical id
 * so that, once existing users are linked (their WorkOS externalId set to their
 * `auth0|...` id), `AuthUser.id` keeps matching all existing FKs. Brand-new users
 * have no externalId and are born with the WorkOS id as canonical.
 *
 * In `workos` mode the WorkOS id is always canonical and there is no link to fail,
 * so `unlinked` is never set.
 */
export function mapUser(u: WorkOSUserish, canonicalId: IdentityOptions['canonicalId']): AuthUser {
    const fullName = u.name ?? [u.firstName, u.lastName].filter(Boolean).join(' ')
    const external = canonicalId === 'external'
    return {
        id: external ? (u.externalId ?? u.id) : u.id,
        email: u.email,
        name: fullName || undefined,
        avatarUrl: u.profilePictureUrl ?? null,
        ...(external && u.linkFailed ? { unlinked: true } : {}),
    }
}

/** Run the configured linker, if any. Without one the user is returned unchanged. */
export async function resolveIdentity(u: WorkOSUserish, opts: IdentityOptions): Promise<WorkOSUserish> {
    return opts.link ? opts.link(u) : u
}
