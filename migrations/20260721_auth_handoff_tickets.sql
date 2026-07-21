-- Cross-app SSO handoff tickets (SSO PR 2).
--
-- A short-lived, single-use ticket that carries an already-authenticated user's
-- session from one origin (spiritb.uk, or the mobile app's in-app browser) into
-- mcloud.co.ke web without re-login. The mint routes (partner-secret / bearer)
-- verify the caller, then seal the WorkOS {accessToken, refreshToken} pair into
-- `sealed_tokens` (AES-GCM, HANDOFF_ENC_KEY) and insert a row. The /auth/handoff
-- redeem route atomically consumes the row and calls saveSession. The ticket id
-- is the only thing that ever appears in a URL; the tokens never do.
--
-- Why sealed tokens and not a bare user_id: saveSession needs a full WorkOS
-- session triple from an auth event; there is no primitive to mint a cookie
-- session from a user_id alone. The mint side already holds real tokens.
--
-- Service-role only (no RLS policies added => with RLS enabled, anon/authenticated
-- roles get nothing; the service-role key used by the API bypasses RLS). Rows are
-- tiny and expire in 60s; a sweep runs opportunistically on insert.

create table if not exists public.auth_handoff_tickets (
  id            text primary key,
  sealed_tokens text        not null,
  redirect_to   text        not null default '/',
  expires_at    timestamptz not null,
  used_at       timestamptz,
  created_at    timestamptz not null default now()
);

-- Redeem looks up by id (PK, already indexed). This index supports the sweep.
create index if not exists auth_handoff_tickets_expires_at_idx
  on public.auth_handoff_tickets (expires_at);

alter table public.auth_handoff_tickets enable row level security;
-- No policies: anon and authenticated get zero rows. The API uses the
-- service-role key, which bypasses RLS.
