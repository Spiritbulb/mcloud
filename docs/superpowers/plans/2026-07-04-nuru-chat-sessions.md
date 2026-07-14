# Nuru Chat Sessions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Nuru's single flat conversation into multiple named chat sessions, listed in a near-full-width Recents drawer, preserving all existing history.

**Architecture:** A new `nuru_chat_sessions` table plus a `session_id` on `nuru_chat_messages` (existing rows backfilled into one "Chat" session per user). New session-scoped mobile API routes. The Expo client threads `sessionId` through its chat service and screen, and the drawer becomes a Recents list. Tests follow the repo idiom: **pure helper functions** unit-tested with `node:test`; DB/route wiring verified manually + on a Supabase branch.

**Tech Stack:** Postgres (Supabase, project `cuptlifacdkeagrrofni`), Next.js 16 route handlers (`apps/web`), Expo/React Native (`apps/nuru`), `@expo/vector-icons` (already bundled).

## Global Constraints

- User ids are **TEXT** (WorkOS `user_...`), not uuid — every user-referencing column is `text`. (verbatim from existing migration)
- **RLS stays off** on nuru tables; access is enforced by server routes scoping every query to `auth.user.id`. Never trust a client-supplied `sessionId` for ownership — always filter by `user_id` too.
- Migrations live in `migrations/YYYYMMDD_<name>.sql`, must be **safe to re-run** (`if not exists`, idempotent backfill).
- Client services are factory functions `create<X>Api(authedFetch)`; screens consume them via `useApi()`.
- Tests are `node:test` + `node:assert/strict` on **pure functions** (no mocked Supabase). Run with `node --test` / `--experimental-strip-types`.
- Branch: `feat/nuru-chat-sessions` (already stacked on the polish+keyboard branch). Commit frequently.
- New session `title` starts `''`; auto-set to the first user message (trimmed ~40 chars) on first send; backfilled sessions are `"Chat"` and never overwritten.

---

## File Structure

**Backend (`apps/web`):**
- `migrations/20260704_nuru_chat_sessions.sql` — new table + `session_id` column + backfill.
- `app/api/mobile/chat/_sessions.ts` — **pure helpers** (title derivation, session-row → DTO mapping). Unit-tested.
- `app/api/mobile/chat/_sessions.test.ts` — tests for the pure helpers.
- `app/api/mobile/chat/sessions/route.ts` — `GET` (list) + `POST` (create).
- `app/api/mobile/chat/route.ts` — MODIFY: `GET` takes `?sessionId`, `POST` takes `sessionId`, auto-title + `updated_at` bump.

**Client (`apps/nuru`):**
- `types/index.ts` — MODIFY: add `ChatSession`.
- `services/chat.ts` — MODIFY: add `listSessions`, `createSession`; thread `sessionId`.
- `app/(tabs)/index.tsx` — MODIFY: read `sessionId` param, load/scope by it.
- `components/DrawerContent.tsx` — MODIFY: Recents list, real icons, 85% width layout, remove Profile.
- `app/(tabs)/_layout.tsx` — MODIFY: drawer width 85%.

---

## Task 1: Database migration (table + column + backfill)

**Files:**
- Create: `migrations/20260704_nuru_chat_sessions.sql`

**Interfaces:**
- Produces: table `public.nuru_chat_sessions (id uuid, user_id text, title text, created_at timestamptz, updated_at timestamptz)`; column `public.nuru_chat_messages.session_id uuid`.

- [ ] **Step 1: Write the migration**

```sql
-- migrations/20260704_nuru_chat_sessions.sql
-- Nuru chat sessions — group the flat nuru_chat_messages into named threads.
-- Existing rows are backfilled into one "Chat" session per user so nobody loses
-- history. RLS stays off; app routes scope by user_id (+ session_id). Re-runnable.

create table if not exists public.nuru_chat_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null references public.users(id) on delete cascade,
  title       text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_nuru_sessions_user
  on public.nuru_chat_sessions (user_id, updated_at desc);

alter table public.nuru_chat_messages
  add column if not exists session_id uuid references public.nuru_chat_sessions(id) on delete cascade;

create index if not exists idx_nuru_chat_session
  on public.nuru_chat_messages (session_id, created_at);

-- Backfill: one "Chat" session per user who has messages, then stamp their rows.
-- Idempotent: only acts on messages that don't yet have a session_id.
do $$
declare
  u text;
  sid uuid;
begin
  for u in
    select distinct user_id from public.nuru_chat_messages where session_id is null
  loop
    insert into public.nuru_chat_sessions (user_id, title, created_at, updated_at)
      values (u, 'Chat', now(), now())
      returning id into sid;
    update public.nuru_chat_messages
      set session_id = sid
      where user_id = u and session_id is null;
  end loop;
end $$;
```

- [ ] **Step 2: Apply to a Supabase branch and verify backfill**

Apply via the Supabase MCP `apply_migration` (or dashboard SQL editor) against a **branch** DB first. Then run this verification query:

```sql
-- Expect: zero rows left unstamped, and one session per user-with-messages.
select
  (select count(*) from public.nuru_chat_messages where session_id is null) as unstamped,
  (select count(distinct user_id) from public.nuru_chat_messages) as users_with_msgs,
  (select count(*) from public.nuru_chat_sessions) as sessions;
```

Expected: `unstamped = 0`; `sessions >= users_with_msgs` (exactly equal if no empty sessions exist yet).

- [ ] **Step 3: Commit**

```bash
git add migrations/20260704_nuru_chat_sessions.sql
git commit -m "feat(nuru): migration for chat sessions + backfill"
```

---

## Task 2: Pure session helpers (title derivation + DTO mapping)

**Files:**
- Create: `apps/web/app/api/mobile/chat/_sessions.ts`
- Test: `apps/web/app/api/mobile/chat/_sessions.test.ts`

**Interfaces:**
- Produces:
  - `deriveTitle(firstUserMessage: string): string` — trims + truncates to 40 chars (adds `…` if cut).
  - `type SessionRow = { id: string; title: string; updated_at: string }`
  - `toSessionDTO(row: SessionRow): { id: string; title: string; updatedAt: string }`

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/app/api/mobile/chat/_sessions.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { deriveTitle, toSessionDTO } from './_sessions.ts'

test('deriveTitle trims and passes short messages through', () => {
  assert.equal(deriveTitle('  What is photosynthesis?  '), 'What is photosynthesis?')
})

test('deriveTitle truncates long messages to 40 chars with an ellipsis', () => {
  const long = 'Explain the causes of the French Revolution in detail please'
  const out = deriveTitle(long)
  assert.ok(out.length <= 41, `too long: ${out.length}`) // 40 + ellipsis
  assert.ok(out.endsWith('…'))
  assert.ok(out.startsWith('Explain the causes'))
})

test('deriveTitle falls back to "New chat" for empty input', () => {
  assert.equal(deriveTitle('   '), 'New chat')
})

test('toSessionDTO maps snake_case row to camelCase DTO', () => {
  const dto = toSessionDTO({ id: 's1', title: 'Chat', updated_at: '2026-07-04T00:00:00.000Z' })
  assert.deepEqual(dto, { id: 's1', title: 'Chat', updatedAt: '2026-07-04T00:00:00.000Z' })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test --experimental-strip-types apps/web/app/api/mobile/chat/_sessions.test.ts`
Expected: FAIL — `Cannot find module './_sessions.ts'`.

- [ ] **Step 3: Write the implementation**

```ts
// apps/web/app/api/mobile/chat/_sessions.ts
// Pure helpers for chat sessions — no I/O, unit-tested. The route handlers do
// the Supabase reads/writes and lean on these for title logic + DTO shape.

const TITLE_MAX = 40

/** First user message → a short session title. Empty input → "New chat". */
export function deriveTitle(firstUserMessage: string): string {
  const t = firstUserMessage.trim()
  if (!t) return 'New chat'
  return t.length > TITLE_MAX ? t.slice(0, TITLE_MAX) + '…' : t
}

export type SessionRow = { id: string; title: string; updated_at: string }

/** Raw session row → camelCase DTO returned to the app. */
export function toSessionDTO(row: SessionRow): { id: string; title: string; updatedAt: string } {
  return { id: row.id, title: row.title, updatedAt: row.updated_at }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test --experimental-strip-types apps/web/app/api/mobile/chat/_sessions.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/api/mobile/chat/_sessions.ts apps/web/app/api/mobile/chat/_sessions.test.ts
git commit -m "feat(nuru): pure session-title + DTO helpers with tests"
```

---

## Task 3: Sessions list + create route

**Files:**
- Create: `apps/web/app/api/mobile/chat/sessions/route.ts`

**Interfaces:**
- Consumes: `requireMobileUser` from `../../_lib`; `toSessionDTO` from `../_sessions`.
- Produces: `GET /api/mobile/chat/sessions` → `{ sessions: {id,title,updatedAt}[] }`; `POST` → `{ id }`.

- [ ] **Step 1: Write the route**

```ts
// apps/web/app/api/mobile/chat/sessions/route.ts
// GET  → the user's chat sessions (only those with ≥1 message), newest first.
// POST → create an empty session, return its id ("New chat").
// Auth: mobile bearer; every query scoped to auth.user.id.
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@mcloud/db/server'
import { requireMobileUser } from '../../_lib'
import { toSessionDTO, type SessionRow } from '../_sessions'

export async function GET(req: NextRequest) {
  const auth = await requireMobileUser(req)
  if (auth instanceof NextResponse) return auth
  const userId = auth.user.id

  const supabase = await createClient()
  // Only sessions that have at least one message (excludes abandoned "New chat").
  const { data, error } = await supabase
    .from('nuru_chat_sessions')
    .select('id, title, updated_at, nuru_chat_messages!inner(id)')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
  if (error) {
    console.error('[nuru sessions list]', error.message)
    return NextResponse.json({ error: 'Could not load sessions' }, { status: 500 })
  }
  // The !inner join yields duplicate session rows (one per message); dedupe by id.
  const seen = new Set<string>()
  const sessions = (data as unknown as SessionRow[])
    .filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)))
    .map(toSessionDTO)
  return NextResponse.json({ sessions })
}

export async function POST(req: NextRequest) {
  const auth = await requireMobileUser(req)
  if (auth instanceof NextResponse) return auth
  const userId = auth.user.id

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('nuru_chat_sessions')
    .insert({ user_id: userId, title: '' })
    .select('id')
    .single()
  if (error || !data) {
    console.error('[nuru sessions create]', error?.message)
    return NextResponse.json({ error: 'Could not create session' }, { status: 500 })
  }
  return NextResponse.json({ id: data.id }, { status: 201 })
}
```

- [ ] **Step 2: Manually verify against the branch DB**

With the web app running (`npx turbo run dev --filter=@mcloud/web -- --port 3000`) and a valid mobile bearer token for the demo user, from a scratch script or curl:

```bash
# List (expect the backfilled "Chat" session):
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/mobile/chat/sessions
# Create (expect { "id": "..." }):
curl -s -X POST -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/mobile/chat/sessions
```

Expected: GET returns the backfilled session; the just-created empty one is **absent** from GET (no messages yet).

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/api/mobile/chat/sessions/route.ts
git commit -m "feat(nuru): chat sessions list + create route"
```

---

## Task 4: Session-scope the existing chat route

**Files:**
- Modify: `apps/web/app/api/mobile/chat/route.ts`

**Interfaces:**
- Consumes: `deriveTitle` from `./_sessions`.
- Produces: `GET /api/mobile/chat?sessionId=…` → messages for that session; `POST` body `{ text, contextNoteIds?, sessionId }` persists into that session, auto-titles, bumps `updated_at`.

- [ ] **Step 1: Modify GET to scope by sessionId**

In `route.ts`, add the import and change the GET query. Full new GET:

```ts
import { deriveTitle } from './_sessions'
// ...existing imports stay...

export async function GET(req: NextRequest) {
  const auth = await requireMobileUser(req)
  if (auth instanceof NextResponse) return auth
  const userId = auth.user.id

  const sessionId = req.nextUrl.searchParams.get('sessionId')
  if (!sessionId) return NextResponse.json({ messages: [] })

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('nuru_chat_messages')
    .select('id, role, text, context_note_ids, created_at')
    .eq('user_id', userId)          // ownership
    .eq('session_id', sessionId)    // thread scope
    .order('created_at', { ascending: true })
  if (error) {
    console.error('[nuru chat history]', error.message)
    return NextResponse.json({ error: 'Could not load history' }, { status: 500 })
  }
  return NextResponse.json({ messages: (data as ChatRow[]).map(toMessage) })
}
```

- [ ] **Step 2: Modify POST to require sessionId, persist into it, auto-title, bump**

Change the body type and the persistence block. The body parse becomes:

```ts
  let body: { text?: string; contextNoteIds?: string[]; sessionId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Expected JSON body' }, { status: 400 })
  }
  const text = (body.text ?? '').trim()
  if (!text) return NextResponse.json({ error: 'Empty message' }, { status: 400 })
  const sessionId = body.sessionId
  if (!sessionId) return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })
```

Add an ownership check right after creating `supabase` (before embedding), so a foreign/invalid session is rejected:

```ts
  const supabase = await createClient()

  // Verify the session belongs to this user before doing any work.
  const { data: sess } = await supabase
    .from('nuru_chat_sessions')
    .select('id, title')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .maybeSingle()
  if (!sess) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
```

Change the insert (step 4 in the file) to include `session_id`:

```ts
  const { error: insErr } = await supabase.from('nuru_chat_messages').insert([
    { user_id: userId, session_id: sessionId, role: 'user', text, context_note_ids: [] },
    { user_id: userId, session_id: sessionId, role: 'assistant', text: answer, context_note_ids: noteIds },
  ])
```

After a successful insert, auto-title (if still empty) and bump `updated_at`:

```ts
  // Auto-title on the first user message; always bump updated_at for ordering.
  const patch: { updated_at: string; title?: string } = { updated_at: new Date().toISOString() }
  if (!sess.title) patch.title = deriveTitle(text)
  await supabase.from('nuru_chat_sessions').update(patch).eq('id', sessionId).eq('user_id', userId)
```

Change the "re-read the assistant message" query to also filter by `session_id`:

```ts
  const { data: saved } = await supabase
    .from('nuru_chat_messages')
    .select('id, role, text, context_note_ids, created_at')
    .eq('user_id', userId)
    .eq('session_id', sessionId)
    .eq('role', 'assistant')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
```

- [ ] **Step 3: Typecheck + manual verify**

Run: `cd apps/web && npx tsc --noEmit` (or the repo's typecheck). Expected: no errors in `chat/route.ts`.

Manual (web app running, demo bearer):
```bash
SID=$(curl -s -X POST -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/mobile/chat/sessions | node -pe 'JSON.parse(require("fs").readFileSync(0)).id')
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"text\":\"What is photosynthesis?\",\"sessionId\":\"$SID\"}" http://localhost:3000/api/mobile/chat
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/mobile/chat/sessions
```
Expected: the new session now appears in the list with title `"What is photosynthesis?"`.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/api/mobile/chat/route.ts
git commit -m "feat(nuru): scope chat GET/POST to a session, auto-title, bump updated_at"
```

---

## Task 5: Client types + chat service

**Files:**
- Modify: `apps/nuru/types/index.ts`
- Modify: `apps/nuru/services/chat.ts`

**Interfaces:**
- Consumes: `AuthedFetch` from `./notes`; `mapMessage` from `./_map`.
- Produces:
  - `ChatSession { id: string; title: string; updatedAt: string }`
  - `createChatApi(authedFetch)` gains `listSessions(): Promise<ChatSession[]>`, `createSession(): Promise<string>`; `history(sessionId: string)` and `send(text, contextNoteIds, sessionId)`.

- [ ] **Step 1: Add the ChatSession type**

Append to `apps/nuru/types/index.ts`:

```ts
export interface ChatSession {
  id: string;
  title: string;
  updatedAt: string; // ISO
}
```

- [ ] **Step 2: Extend the chat service**

Replace the body of `apps/nuru/services/chat.ts` with:

```ts
import { Message, ChatSession } from '@/types';
import { mapMessage } from './_map';
import type { AuthedFetch } from './notes';

export function createChatApi(authedFetch: AuthedFetch) {
  return {
    async listSessions(): Promise<ChatSession[]> {
      const res = await authedFetch('/api/mobile/chat/sessions');
      if (!res.ok) throw new Error('Could not load sessions');
      const { sessions } = (await res.json()) as { sessions: ChatSession[] };
      return sessions;
    },

    async createSession(): Promise<string> {
      const res = await authedFetch('/api/mobile/chat/sessions', { method: 'POST' });
      if (!res.ok) throw new Error('Could not start a new chat');
      const { id } = (await res.json()) as { id: string };
      return id;
    },

    async history(sessionId: string): Promise<Message[]> {
      const res = await authedFetch(`/api/mobile/chat?sessionId=${encodeURIComponent(sessionId)}`);
      if (!res.ok) throw new Error('Could not load chat');
      const { messages } = (await res.json()) as { messages: Message[] };
      return messages.map(mapMessage);
    },

    async send(text: string, contextNoteIds: string[], sessionId: string): Promise<Message> {
      const res = await authedFetch('/api/mobile/chat', {
        method: 'POST',
        body: JSON.stringify({ text, contextNoteIds, sessionId }),
      });
      if (!res.ok) throw new Error('Could not send message');
      const { message } = (await res.json()) as { message: Message };
      return mapMessage(message);
    },
  };
}
```

- [ ] **Step 3: Typecheck**

Run: `cd apps/nuru && npx tsc --noEmit`
Expected: FAIL — `app/(tabs)/index.tsx` still calls `history()`/`send()` with the old signatures. That's fixed in Task 6; do not "fix" it here.

- [ ] **Step 4: Commit**

```bash
git add apps/nuru/types/index.ts apps/nuru/services/chat.ts
git commit -m "feat(nuru): chat service gains sessions (list/create/scoped history+send)"
```

---

## Task 6: Chat screen consumes sessionId

**Files:**
- Modify: `apps/nuru/app/(tabs)/index.tsx`

**Interfaces:**
- Consumes: `chat.history(sessionId)`, `chat.send(text, contextNoteIds, sessionId)`, `chat.createSession()`.

- [ ] **Step 1: Read sessionId param and load per session**

At the top of the `Chat` component, change the params + history load. `useLocalSearchParams` now also reads `sessionId`; if none is present, create one on mount so a bare "Chat" tab still works:

```tsx
  const params = useLocalSearchParams<{ noteId?: string; sessionId?: string }>();
  const [sessionId, setSessionId] = useState<string | null>(params.sessionId ?? null);
  // ...existing messages/context/sending state...

  // Resolve a session: use the routed one, else start a fresh session.
  useEffect(() => {
    let cancelled = false;
    async function resolve() {
      const sid = params.sessionId ?? (await chat.createSession());
      if (cancelled) return;
      setSessionId(sid);
      chat.history(sid).then(setMessages);
    }
    resolve();
    return () => { cancelled = true; };
  }, [params.sessionId]);
```

Remove the old `useEffect(() => { chat.history().then(setMessages); }, [])`.

- [ ] **Step 2: Pass sessionId when sending**

In `onSend`, guard on `sessionId` and pass it:

```tsx
  async function onSend(text: string) {
    if (!sessionId) return;
    setSending(true);
    const optimistic: Message = {
      id: 'tmp', role: 'user', text, contextNoteIds, createdAt: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimistic]);
    try {
      await chat.send(text, contextNoteIds, sessionId);
      setMessages(await chat.history(sessionId));
    } finally {
      setSending(false);
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    }
  }
```

- [ ] **Step 3: Typecheck**

Run: `cd apps/nuru && npx tsc --noEmit`
Expected: PASS (Task 5's signature change is now satisfied).

- [ ] **Step 4: Commit**

```bash
git add apps/nuru/app/(tabs)/index.tsx
git commit -m "feat(nuru): chat screen loads and sends within a session"
```

---

## Task 7: Drawer becomes the Recents list

**Files:**
- Modify: `apps/nuru/components/DrawerContent.tsx`
- Modify: `apps/nuru/app/(tabs)/_layout.tsx`

**Interfaces:**
- Consumes: `chat.listSessions()`, `chat.createSession()` via `useApi()`; `Feather` from `@expo/vector-icons`.

- [ ] **Step 0: Install `@expo/vector-icons`**

It is NOT currently in `apps/nuru/node_modules` (verified) and is not transitively resolvable via `expo`. Install the Expo-matched version. It ships prebuilt icon fonts (no native linking), so it stays OTA-safe — no rebuild needed.

Run: `cd apps/nuru && npx expo install @expo/vector-icons`
Expected: added to `apps/nuru/package.json` dependencies; `node_modules/@expo/vector-icons/build/Feather.js` now exists.

- [ ] **Step 1: Widen the drawer to 85%**

In `app/(tabs)/_layout.tsx`, replace the fixed width. Add at top:

```tsx
import { Dimensions } from 'react-native';
```

Change `drawerStyle`:

```tsx
        drawerStyle: { backgroundColor: theme.colors.bg, width: Dimensions.get('window').width * 0.85 },
```

- [ ] **Step 2: Rewrite DrawerContent as Recents**

Replace `apps/nuru/components/DrawerContent.tsx` with:

```tsx
import { useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { DrawerContentComponentProps, DrawerContentScrollView } from 'expo-router/drawer';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Logo } from '@/components/Logo';
import { useAuth } from '@/context/AuthContext';
import { useApi } from '@/hooks/useApi';
import { ChatSession } from '@/types';
import { theme } from '@/theme';

/**
 * The Nuru drawer — near-full-width Recents list in the Claude reference's shape:
 * brand, "New chat", the session list, Notes pinned above a divider, and the
 * signed-in user with a settings gear in the footer.
 */
export function DrawerContent(props: DrawerContentComponentProps) {
  const { user } = useAuth();
  const { chat } = useApi();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [sessions, setSessions] = useState<ChatSession[]>([]);

  // Refresh the list whenever the drawer regains focus (after a new message the
  // title/order may have changed).
  useFocusEffect(
    useCallback(() => {
      chat.listSessions().then(setSessions).catch(() => {});
    }, [chat]),
  );

  async function newChat() {
    const id = await chat.createSession();
    props.navigation.closeDrawer();
    router.push({ pathname: '/(tabs)', params: { sessionId: id } });
  }

  function openSession(id: string) {
    props.navigation.closeDrawer();
    router.push({ pathname: '/(tabs)', params: { sessionId: id } });
  }

  return (
    <View style={styles.container}>
      <DrawerContentScrollView
        {...props}
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + theme.spacing.sm }]}
      >
        <View style={styles.brand}>
          <Logo size={30} />
          <Text style={styles.brandText}>Nuru</Text>
        </View>

        <Pressable onPress={newChat} style={styles.newChat} accessibilityLabel="New chat">
          <Feather name="edit" size={18} color={theme.colors.primary} />
          <Text style={styles.newChatLabel}>New chat</Text>
        </Pressable>

        <Text style={styles.section}>RECENTS</Text>
        {sessions.map((s) => (
          <Pressable key={s.id} onPress={() => openSession(s.id)} style={styles.row}>
            <Feather name="message-circle" size={16} color={theme.colors.textMuted} />
            <Text style={styles.rowLabel} numberOfLines={1}>{s.title || 'New chat'}</Text>
          </Pressable>
        ))}

        <View style={styles.divider} />

        <Pressable onPress={() => { props.navigation.closeDrawer(); router.push('/notes'); }} style={styles.row}>
          <Feather name="file-text" size={16} color={theme.colors.textMuted} />
          <Text style={styles.rowLabel}>Notes</Text>
        </Pressable>
      </DrawerContentScrollView>

      <SafeAreaView edges={['bottom']} style={styles.footer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(user?.name?.[0] ?? 'S').toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.userName} numberOfLines={1}>{user?.name ?? 'Student'}</Text>
          <Text style={styles.userEmail} numberOfLines={1}>{user?.email ?? ''}</Text>
        </View>
        <Pressable
          onPress={() => { props.navigation.closeDrawer(); router.push('/profile'); }}
          hitSlop={8}
          accessibilityLabel="Settings"
          style={styles.gear}
        >
          <Feather name="settings" size={18} color={theme.colors.textMuted} />
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  scroll: { paddingTop: theme.spacing.sm },
  brand: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  brandText: { fontFamily: theme.fonts.display, fontSize: 24, color: theme.colors.text },
  newChat: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md,
    marginHorizontal: theme.spacing.sm, paddingHorizontal: theme.spacing.md,
    paddingVertical: 11, borderRadius: theme.radii.md, marginBottom: theme.spacing.sm,
  },
  newChatLabel: { fontSize: 16, color: theme.colors.primary, fontWeight: '600' },
  section: {
    fontSize: 11, fontWeight: '700', color: theme.colors.textMuted, letterSpacing: 1,
    paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.sm, paddingBottom: theme.spacing.xs,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md,
    marginHorizontal: theme.spacing.sm, paddingHorizontal: theme.spacing.md,
    paddingVertical: 11, borderRadius: theme.radii.md,
  },
  rowLabel: { fontSize: 15, color: theme.colors.text, flex: 1 },
  divider: { height: 1, backgroundColor: theme.colors.border, marginHorizontal: theme.spacing.md, marginVertical: theme.spacing.sm },
  footer: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.md,
    borderTopWidth: 1, borderTopColor: theme.colors.border,
  },
  avatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 17, fontWeight: '700', color: theme.colors.primary },
  userName: { color: theme.colors.text, fontSize: 15, fontWeight: '600' },
  userEmail: { color: theme.colors.textMuted, fontSize: 13 },
  gear: { padding: theme.spacing.xs },
});
```

- [ ] **Step 3: Typecheck**

Run: `cd apps/nuru && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Verify the build still exports (catches SDK-56 import bans early)**

Run: `cd apps/nuru && npx expo export --output-dir dist-verify --platform android 2>&1 | tail -5 && rm -rf dist-verify`
Expected: `Exported: dist-verify`, exit 0.

- [ ] **Step 5: Commit**

```bash
git add apps/nuru/components/DrawerContent.tsx apps/nuru/app/(tabs)/_layout.tsx apps/nuru/package.json apps/nuru/package-lock.json
git commit -m "feat(nuru): drawer becomes 85%-width Recents list with real icons"
```

---

## Task 8: Apply the migration to production + end-to-end device check

**Files:** none (deployment + manual verification)

- [ ] **Step 1: Apply the migration to the production DB**

Apply `migrations/20260704_nuru_chat_sessions.sql` to project `cuptlifacdkeagrrofni` (via Supabase MCP `apply_migration` or dashboard). Re-run the Task 1 verification query against production. Expected: `unstamped = 0`.

- [ ] **Step 2: On-device end-to-end (the honest test)**

`cd apps/nuru && npm start`, sign in as the demo user, then verify:
- Drawer opens at ~85% width, real icons, **no Profile item**, Notes present.
- The backfilled **"Chat"** session shows the demo user's prior history.
- **New chat** → send "What is photosynthesis?" → the reply arrives; open the drawer → a new Recents row titled "What is photosynthesis?" sits above "Chat".
- Reopen each session → correct history loads in each.
- Note scoping still works: open a note → "Chat about this note" → the scope chip shows, and the message is scoped.

- [ ] **Step 3: Final commit / branch wrap**

No code change expected here; if device testing surfaced tweaks, commit them, then this branch is ready to finish (merge/PR) via the finishing-a-development-branch flow.

---

## Self-Review

**Spec coverage:**
- Table + `session_id` + backfill → Task 1 ✓
- List/create routes → Task 3 ✓; session-scoped GET/POST + auto-title + bump → Task 4 ✓
- Ownership scoping (never another user's rows) → Task 4 GET (`user_id`+`session_id`), POST ownership check ✓
- Empty sessions excluded from list → Task 3 (`!inner` join) ✓
- Client types/service → Task 5 ✓; screen → Task 6 ✓
- Drawer 85% + real icons + Notes pinned + Profile removed + smaller rows → Task 7 ✓
- Auto-title from first message, `''` default, backfilled `"Chat"` never overwritten → Task 4 + Task 2 helper ✓
- Testing: pure helpers unit-tested (Task 2), migration verified on branch (Task 1) + prod (Task 8), manual device (Task 8) ✓

**Placeholder scan:** none — every code step shows complete code; every command has expected output.

**Type consistency:** `ChatSession {id,title,updatedAt}` (Task 5) matches `toSessionDTO` output (Task 2) and the `{sessions}` route shape (Task 3). `history(sessionId)` / `send(text, contextNoteIds, sessionId)` signatures are consistent across Tasks 5 and 6. `deriveTitle` referenced in Task 4 is defined in Task 2.

**Note on tests:** This codebase tests pure functions only (no Supabase mocking harness exists). Route-level ownership scoping is therefore verified by manual curl (Task 3/4) and device testing (Task 8) rather than an integration test — consistent with the existing `_map.test.ts` / `chunk.test.ts` idiom. If an integration harness is added later, the ownership cases in Task 4 are the priority to automate.
