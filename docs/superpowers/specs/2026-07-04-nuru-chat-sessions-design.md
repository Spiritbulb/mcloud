# Nuru Chat Sessions — Design

**Date:** 2026-07-04
**Branch:** `feat/nuru-chat-sessions` (stacked on `feat/nuru-chat-ui-polish`)
**Status:** Approved, ready for implementation plan

## Goal

Turn Nuru's single flat conversation into multiple named chat sessions, surfaced
as a Recents-style list in a near-full-width drawer that matches the Claude
reference. Existing chat history is preserved — no user loses their conversation.

## Context

Today, chat is one endless per-user thread:

- Table `nuru_chat_messages`: `id uuid`, `user_id text`, `role`, `text`,
  `context_note_ids uuid[]`, `created_at`. **RLS is off** — every query is
  scoped to `auth.user.id` inside the server routes (`requireMobileUser`).
- `GET /api/mobile/chat` returns all of the user's messages; `POST` appends a
  user+assistant pair. No session concept exists.
- Client: `services/chat.ts` (`history()`, `send()`), chat screen at
  `app/(tabs)/index.tsx`, drawer at `components/DrawerContent.tsx`.

This slice builds on the UI polish + keyboard passes already on the parent
branch (reference-style bubbles, single-card composer, keyboard-aware `Screen`,
drawer with "New chat"/divider/footer gear).

## 1. Data model (migration)

New table `nuru_chat_sessions`:

| column      | type          | notes                          |
|-------------|---------------|--------------------------------|
| id          | uuid pk       | `default gen_random_uuid()`    |
| user_id     | text not null | matches `nuru_chat_messages.user_id` (WorkOS/auth id) |
| title       | text not null | `default ''`; new sessions start `''`, auto-set on first message; backfilled rows = `"Chat"` |
| created_at  | timestamptz   | `default now()`                |
| updated_at  | timestamptz   | `default now()`; bumped on each new message |

Alter `nuru_chat_messages`: add `session_id uuid` (nullable during backfill).

**Backfill (single idempotent migration):**

1. For each distinct `user_id` in `nuru_chat_messages`, insert one session
   titled `"Chat"`.
2. Set `session_id` on all of that user's existing message rows to their new
   session's id.
3. After backfill, all new inserts carry `session_id`. (Column stays nullable in
   the DB to keep the migration reversible, but the application always writes it.)

RLS stays off — access enforced by server routes scoping to `auth.user.id`
(and `session_id`), consistent with the rest of the mobile API.

## 2. Backend routes

All under `app/api/mobile/chat/`, all use `requireMobileUser`, all scope every
query to `auth.user.id`.

- **`GET /api/mobile/chat/sessions`** → `{ sessions: [{ id, title, updatedAt }] }`,
  ordered by `updated_at desc`. Only sessions that have ≥1 message are returned
  (so an abandoned empty "New chat" never clutters Recents). Feeds the drawer.
- **`POST /api/mobile/chat/sessions`** → creates an empty session, returns
  `{ id }`. Called by "New chat".
- **`GET /api/mobile/chat?sessionId=…`** → messages for that one session, scoped
  to `user_id` + `session_id`. Replaces "all my messages". A missing/foreign
  `sessionId` returns an empty list (never another user's rows).
- **`POST /api/mobile/chat`** → body gains `sessionId`. Persists the user +
  assistant rows with that `session_id`; bumps the session's `updated_at`.
  **Auto-title:** if the session's `title` is still `''` (its first user
  message), set `title` = first user message trimmed to ~40 chars. Backfilled
  sessions (`"Chat"`) and already-titled sessions are never overwritten.

Security note: session ownership is always derived from the authed user, never
trusted from the client. Requesting another user's `sessionId` yields nothing.

## 3. Client — services & state

- `types/index.ts`: add `ChatSession { id: string; title: string; updatedAt: string }`.
- `services/chat.ts`: add `listSessions()`, `createSession()`; thread `sessionId`
  through `history(sessionId)` and `send(text, contextNoteIds, sessionId)`.
- `app/(tabs)/index.tsx`: takes a `sessionId` route param.
  - Opening a session loads its history via `history(sessionId)`.
  - "New chat" calls `createSession()` and navigates to the new empty session.
  - Per-message note scoping (`noteId` → `contextNoteIds`) is unchanged;
    sessions and scope are orthogonal.
  - On send, pass the current `sessionId`; after the reply, the drawer's session
    list should reflect the (possibly new) title and updated order.

## 4. Drawer rework (`DrawerContent.tsx` + `app/(tabs)/_layout.tsx`)

- **Width → 85%** of screen width (via `Dimensions`), replacing the fixed `288`.
- **Real icons** via `@expo/vector-icons` (Feather) — installed via
  `npx expo install` (not currently present). Ships prebuilt icon fonts, no
  native linking, so it stays OTA-safe. Replaces the current text glyphs:
  - New chat → `edit`/`plus`
  - session row → `message-circle`
  - Notes → `file-text`
  - footer settings → `settings` (gear)
- **Layout:** brand → **New chat** → **RECENTS** section header → session list
  (from `listSessions()`; tap opens that thread; active session highlighted) →
  divider → **Notes** (pinned) → user footer with gear.
- **Profile item removed** — redundant; the footer gear routes to profile.
- **Smaller row height** — `paddingVertical ≈ 11–12` (down from 16).
- The drawer fetches sessions when it opens and after a new message is sent, so
  titles and ordering stay current (focus effect or a shared refresh signal).

## 5. Deferred (YAGNI)

Session rename, delete, model-summarized titles, per-note session binding. All
additive later; none required to ship the core feature.

## 6. Testing

- **Backend unit** (mocked Supabase, like existing route tests):
  - `GET ?sessionId` never returns another user's rows (ownership scoping).
  - First user message sets the session title; later messages don't overwrite it.
  - `updated_at` bumps on new messages; list order follows it.
  - Empty sessions are excluded from the list.
- **Migration:** on a Supabase branch DB, verify backfill assigns exactly one
  session per user with messages, and no message row is left `session_id NULL`.
- **Manual on device:** New chat → send → appears in Recents with the correct
  truncated title; reopen it; the backfilled "Chat" session still shows prior
  history; drawer is ~85% width with real icons and no Profile item.

## Decisions locked during brainstorming

- Existing messages **backfilled into one "Chat" session** per user (not wiped,
  not left session-less).
- Titles **auto-derived from the first message** (truncated), set on first send.
- Scope stays **per-message**; sessions are orthogonal threads.
- Drawer: **85% width, real Feather icons, smaller rows, Profile removed**,
  Notes pinned, gear in footer.
