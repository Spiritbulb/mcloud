-- ============================================================================
-- org_invites: give every invite a token and an expiry
--
-- store_invites has always defaulted token to random hex and expires_at to
-- now() + 7 days; org_invites never did. Every org invite was created with a
-- null token (the email linked to /invite/org/null) and a null expiry (so the
-- "already invited" check, `expires_at > now()`, never matched). org_id and
-- invited_by also defaulted to gen_random_uuid(), which can only ever produce
-- a foreign-key error.
--
-- The app now sets token and expires_at itself (members/actions.ts); these
-- defaults and constraints make the table safe on its own, matching
-- store_invites. Idempotent.
--
-- Existing rows: an invite without a token was emailed a dead /null link, so it
-- is expired as of its creation rather than revived (the owner re-invites).
-- ============================================================================

update public.org_invites
   set expires_at = coalesce(created_at, now())
 where token is null;

update public.org_invites
   set token = encode(extensions.gen_random_bytes(24), 'hex')
 where token is null;

update public.org_invites
   set expires_at = coalesce(created_at, now()) + interval '7 days'
 where expires_at is null;

alter table public.org_invites
  alter column token set default encode(extensions.gen_random_bytes(24), 'hex'),
  alter column token set not null,
  alter column expires_at set default (now() + interval '7 days'),
  alter column expires_at set not null,
  alter column org_id drop default,
  alter column org_id set not null,
  alter column invited_by drop default,
  alter column email set not null,
  alter column role set not null;

alter table public.org_invites drop constraint if exists org_invites_token_key;
alter table public.org_invites add constraint org_invites_token_key unique (token);

alter table public.org_invites drop constraint if exists org_invites_role_check;
alter table public.org_invites add constraint org_invites_role_check check (role in ('admin', 'member'));
