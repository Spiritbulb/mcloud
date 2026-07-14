# Nuru App — Auth Scaffold (Slice 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up `apps/nuru` in the mcloud monorepo — the Nuru dark-theme Expo app with real WorkOS magic-code login working end-to-end against the existing `/api/mobile/*` endpoints.

**Architecture:** `apps/nuru` is a standalone npm project inside the monorepo (NOT in root workspaces — matches `apps/mobile`, avoids RN/Next dependency clashes). The existing standalone Nuru scaffold (`c:\Users\busie\nuru`) is copied in and rewired: its mock `services/auth.ts` + `context/SessionContext.tsx` are replaced by an `AuthContext` ported from `apps/mobile` (magic-code path only), and the auth screens call real endpoints. Chat/Notes/Profile keep their mock services this slice. The app talks to `apps/web` (`/api/mobile/*`) over HTTP; it never imports the `@mcloud/*` server packages.

**Tech Stack:** Expo SDK 57, Expo Router, React Native, TypeScript (strict). Auth: `expo-secure-store` (token storage) + `expo-auth-session` (token refresh) against the shared WorkOS client. No test runner — verification is `npx tsc --noEmit` plus driven/manual click-through on Expo web.

## Global Constraints

- Source scaffold to copy: `c:\Users\busie\nuru` (leave it intact — copy, do not move/delete).
- Nuru path alias stays `@/*` → app root (`./*`), as in the scaffold's tsconfig. Do NOT switch to `apps/mobile`'s `@/* → ./src/*`.
- `apps/nuru` is standalone: NOT added to root `package.json` `workspaces`. It installs its own `node_modules`.
- Shared WorkOS client (do not create a new one): `workosClientId` = `client_01KR36PTHAC1K3G9AV4KRYQRA2`, `workosDomain` = `https://api.workos.com`.
- Login is magic-code only (`send-code` / `verify`). No browser PKCE, no `AuthRequest`/`promptAsync`/`exchangeCodeAsync`, no `mcloud://` deep-link scheme, no `app/auth.tsx` route.
- Dev `apiBaseUrl` default = `http://localhost:3000` (local `apps/web`). Prod URL is `https://www.menengai.cloud` (from `apps/mobile/app.json`), used only if pointing at deployed backend.
- No new backend code: `POST /api/mobile/auth/send-code`, `POST /api/mobile/auth/verify`, `GET /api/mobile/me` already exist and are production-tested.
- TypeScript strict stays on; every task ends green on `npx tsc --noEmit` (run from `apps/nuru`).
- Chat/Notes/Profile screens and their mock `services/{notes,chat,client}.ts` are unchanged this slice.
- Branch: `feat/nuru-app` (already created off `main`).
- Work from `c:\Users\busie\mcloud-1` (the monorepo). Use the Bash tool for `npx`/`cp` on Windows (Git Bash).

---

## Task 1: Copy the Nuru scaffold into `apps/nuru` and make it typecheck standalone

**Files:**
- Create: `apps/nuru/` (copy of scaffold minus `node_modules`, `.git`, `.expo`, `docs`, `.superpowers`)
- Modify: `apps/nuru/app.json` (identity, extra config, secure-store plugin)
- Modify: `apps/nuru/tsconfig.json` (keep as-is; verify)
- Delete: `apps/nuru/docs/`, `apps/nuru/.superpowers/` if copied

**Interfaces:**
- Produces: a standalone `apps/nuru` Expo app that installs and typechecks; `app.json` `extra` exposing `apiBaseUrl`, `workosClientId`, `workosDomain`.

- [ ] **Step 1: Copy scaffold source into apps/nuru**

From `c:\Users\busie\mcloud-1`, copy everything except heavy/irrelevant dirs:
```bash
mkdir -p apps/nuru
# copy tracked source + assets + config, excluding node_modules/.git/.expo/docs/.superpowers
(cd /c/Users/busie/nuru && \
  cp -r app components context services theme types assets \
        package.json app.json tsconfig.json .gitignore /c/Users/busie/mcloud-1/apps/nuru/ 2>/dev/null)
# babel.config.js may or may not exist in the scaffold; copy if present
[ -f /c/Users/busie/nuru/babel.config.js ] && cp /c/Users/busie/nuru/babel.config.js /c/Users/busie/mcloud-1/apps/nuru/ || true
```
Confirm the tree:
```bash
ls apps/nuru && ls apps/nuru/app apps/nuru/components
```
Expected: `app/ components/ context/ services/ theme/ types/ assets/ package.json app.json tsconfig.json`.

- [ ] **Step 2: Remove any copied docs/superpowers cruft**

```bash
rm -rf apps/nuru/docs apps/nuru/.superpowers apps/nuru/.expo apps/nuru/node_modules 2>/dev/null || true
ls apps/nuru
```
Expected: no `docs/`, `.superpowers/`, `.expo/`, `node_modules/`.

- [ ] **Step 3: Set app.json identity + extra config + secure-store plugin**

Replace `apps/nuru/app.json` with (dark splash `#14110F`, Nuru identity, `extra` config, `expo-secure-store` plugin — required so `SecureStore` links in the dev/build; `scheme` kept as `nuru` for app-internal linking only, NOT used for auth):
```json
{
  "expo": {
    "name": "Nuru",
    "slug": "nuru",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "nuru",
    "userInterfaceStyle": "dark",
    "ios": { "supportsTablet": true },
    "android": {
      "adaptiveIcon": {
        "backgroundColor": "#FFFFFF",
        "foregroundImage": "./assets/images/android-icon-foreground.png",
        "backgroundImage": "./assets/images/android-icon-background.png",
        "monochromeImage": "./assets/images/android-icon-monochrome.png"
      },
      "predictiveBackGestureEnabled": false
    },
    "web": { "bundler": "metro", "output": "static", "favicon": "./assets/images/favicon.png" },
    "plugins": [
      "expo-router",
      "expo-secure-store",
      [
        "expo-splash-screen",
        { "image": "./assets/images/splash-icon.png", "resizeMode": "contain", "backgroundColor": "#14110F" }
      ]
    ],
    "experiments": { "typedRoutes": true },
    "extra": {
      "apiBaseUrl": "http://localhost:3000",
      "webBaseUrl": "http://localhost:3000",
      "workosClientId": "client_01KR36PTHAC1K3G9AV4KRYQRA2",
      "workosDomain": "https://api.workos.com"
    }
  }
}
```

- [ ] **Step 4: Verify tsconfig keeps the scaffold alias**

Confirm `apps/nuru/tsconfig.json` still contains `"paths": { "@/*": ["./*"] }` and `"ignoreDeprecations": "6.0"` and `"strict": true`. If the copy is correct, no edit is needed. Read it to confirm:
```bash
cat apps/nuru/tsconfig.json
```
Expected: `@/*` → `./*`, strict true, ignoreDeprecations "6.0".

- [ ] **Step 5: Install dependencies**

```bash
cd apps/nuru && npm install
```
Expected: installs without peer-dependency errors that block. `@react-navigation/drawer`, `@expo-google-fonts/fraunces`, etc. present from the copied package.json.

- [ ] **Step 6: Typecheck**

```bash
cd apps/nuru && npx tsc --noEmit
```
Expected: exit 0, no errors (this is the unchanged scaffold, which was green before).

- [ ] **Step 7: Commit**

```bash
cd /c/Users/busie/mcloud-1
git add apps/nuru
git commit -m "feat(nuru): copy Nuru scaffold into apps/nuru (standalone app)"
```

---

## Task 2: Add auth dependencies and the runtime config module

**Files:**
- Modify: `apps/nuru/package.json` (via `expo install`)
- Create: `apps/nuru/lib/config.ts`

**Interfaces:**
- Produces: `config` object with `{ apiBaseUrl: string; webBaseUrl: string; workosClientId: string; workosDomain: string }`, imported as `@/lib/config`.

- [ ] **Step 1: Install auth dependencies (SDK-57 matched)**

```bash
cd apps/nuru && npx expo install expo-secure-store expo-auth-session
```
Expected: adds `expo-secure-store` and `expo-auth-session` at SDK-57-compatible versions to `apps/nuru/package.json`. (`expo-constants`, `expo-web-browser` are already present from the scaffold.)

- [ ] **Step 2: Write the config module**

`apps/nuru/lib/config.ts`:
```typescript
// Runtime config, read from app.json `extra`. apiBaseUrl points at apps/web,
// which hosts /api/mobile/*. workosClientId/Domain are shared with mcloud and
// used only for the token-refresh call.
import Constants from 'expo-constants';

type Extra = {
  apiBaseUrl?: string;
  webBaseUrl?: string;
  workosClientId?: string;
  workosDomain?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

export const config = {
  apiBaseUrl: extra.apiBaseUrl ?? 'http://localhost:3000',
  webBaseUrl: extra.webBaseUrl ?? 'http://localhost:3000',
  workosClientId: extra.workosClientId ?? '',
  workosDomain: extra.workosDomain ?? 'https://api.workos.com',
};
```

- [ ] **Step 3: Typecheck**

```bash
cd apps/nuru && npx tsc --noEmit
```
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
cd /c/Users/busie/mcloud-1
git add apps/nuru/package.json apps/nuru/package-lock.json apps/nuru/lib/config.ts
git commit -m "feat(nuru): add auth deps (secure-store, auth-session) + runtime config"
```

---

## Task 3: Port the magic-code AuthContext

**Files:**
- Create: `apps/nuru/context/AuthContext.tsx`
- Delete: `apps/nuru/context/SessionContext.tsx` (replaced by AuthContext)
- Delete: `apps/nuru/services/auth.ts` (mock auth replaced by real endpoints)

**Interfaces:**
- Consumes: `config` from `@/lib/config`; the endpoints `POST {apiBaseUrl}/api/mobile/auth/send-code`, `POST .../verify`, `GET .../me`.
- Produces:
  - `useAuth(): { user: SessionUser | null; loading: boolean; sendCode(email): Promise<void>; verifyCode(email, code): Promise<void>; signOut(): Promise<void>; authedFetch(path, init?): Promise<Response>; refreshSession(): Promise<void> }`
  - `<AuthProvider>` component.
  - `SessionUser = { id: string; email: string; name?: string; avatarUrl?: string | null; isAdmin?: boolean }`

- [ ] **Step 1: Write AuthContext (magic-code path only)**

`apps/nuru/context/AuthContext.tsx`:
```tsx
// WorkOS magic-code auth for Nuru (no browser, no deep-link scheme).
// Ported from apps/mobile/src/auth/AuthContext.tsx, keeping only the magic-code
// path: sendCode/verifyCode POST to our backend, tokens persist in secure-store,
// authedFetch attaches the bearer and refreshes once on 401. The access token is
// the same WorkOS JWT /api/mobile/* verifies via JWKS.
import * as React from 'react';
import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import { config } from '@/lib/config';

const TOKEN_KEY = 'nuru.workos.tokens';
const USER_KEY = 'nuru.workos.user';

const discovery: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: `${config.workosDomain}/user_management/authorize`,
  tokenEndpoint: `${config.workosDomain}/user_management/authenticate`,
};

type Tokens = { accessToken: string; refreshToken?: string; expiresAt?: number };

export type SessionUser = {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string | null;
  isAdmin?: boolean;
};

type AuthState = {
  user: SessionUser | null;
  loading: boolean;
  sendCode: (email: string) => Promise<void>;
  verifyCode: (email: string, code: string) => Promise<void>;
  signOut: () => Promise<void>;
  authedFetch: (path: string, init?: RequestInit) => Promise<Response>;
  refreshSession: () => Promise<void>;
};

const AuthContext = React.createContext<AuthState | null>(null);

async function saveTokens(t: Tokens) {
  await SecureStore.setItemAsync(TOKEN_KEY, JSON.stringify(t));
}
async function loadTokens(): Promise<Tokens | null> {
  const raw = await SecureStore.getItemAsync(TOKEN_KEY);
  return raw ? (JSON.parse(raw) as Tokens) : null;
}
async function clearTokens() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  try { await SecureStore.deleteItemAsync(USER_KEY); } catch {}
}

async function refreshTokens(): Promise<Tokens | null> {
  const tokens = await loadTokens();
  if (!tokens?.refreshToken) return null;
  try {
    const refreshed = await AuthSession.refreshAsync(
      { clientId: config.workosClientId, refreshToken: tokens.refreshToken },
      discovery,
    );
    const next: Tokens = {
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken ?? tokens.refreshToken,
      expiresAt: refreshed.expiresIn ? Date.now() + refreshed.expiresIn * 1000 : undefined,
    };
    await saveTokens(next);
    return next;
  } catch {
    return null;
  }
}

async function saveUser(u: SessionUser) {
  try { await SecureStore.setItemAsync(USER_KEY, JSON.stringify(u)); } catch {}
}
async function loadCachedUser(): Promise<SessionUser | null> {
  try {
    const raw = await SecureStore.getItemAsync(USER_KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch { return null; }
}

type MeResult =
  | { kind: 'ok'; user: SessionUser }
  | { kind: 'unauthorized' }
  | { kind: 'network' };

async function fetchMe(accessToken: string): Promise<MeResult> {
  let res: Response;
  try {
    res = await fetch(`${config.apiBaseUrl}/api/mobile/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch {
    return { kind: 'network' };
  }
  if (res.status === 401 || res.status === 403) return { kind: 'unauthorized' };
  if (!res.ok) return { kind: 'network' };
  try {
    const data = (await res.json()) as { user: SessionUser & { role?: string } };
    const raw = data.user;
    const user: SessionUser = {
      id: raw.id,
      email: raw.email,
      name: raw.name,
      avatarUrl: raw.avatarUrl,
      isAdmin: raw.role === 'admin',
    };
    return { kind: 'ok', user };
  } catch {
    return { kind: 'network' };
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<SessionUser | null>(null);
  const [loading, setLoading] = React.useState(true);

  const hydrate = React.useCallback(async () => {
    let tokens = await loadTokens();
    if (!tokens?.accessToken) {
      setUser(null);
      setLoading(false);
      return;
    }
    if (tokens.expiresAt && tokens.expiresAt - Date.now() < 60_000) {
      const refreshed = await refreshTokens();
      if (refreshed) tokens = refreshed;
    }
    let me = await fetchMe(tokens.accessToken);
    if (me.kind === 'unauthorized') {
      const refreshed = await refreshTokens();
      if (refreshed) me = await fetchMe(refreshed.accessToken);
    }
    if (me.kind === 'ok') {
      await saveUser(me.user);
      setUser(me.user);
    } else if (me.kind === 'network') {
      const cached = await loadCachedUser();
      setUser((prev) => prev ?? cached);
    } else {
      await clearTokens();
      setUser(null);
    }
    setLoading(false);
  }, []);

  React.useEffect(() => { hydrate(); }, [hydrate]);

  const sendCode = React.useCallback(async (email: string) => {
    const res = await fetch(`${config.apiBaseUrl}/api/mobile/auth/send-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error ?? 'Could not send a code. Please try again.');
    }
  }, []);

  const verifyCode = React.useCallback(async (email: string, code: string) => {
    const res = await fetch(`${config.apiBaseUrl}/api/mobile/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      accessToken?: string; refreshToken?: string; expiresIn?: number; error?: string;
    };
    if (!res.ok || !data.accessToken) {
      throw new Error(data.error ?? 'That code is invalid or expired.');
    }
    await saveTokens({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt: data.expiresIn ? Date.now() + data.expiresIn * 1000 : undefined,
    });
    await hydrate();
  }, [hydrate]);

  const signOut = React.useCallback(async () => {
    await clearTokens();
    setUser(null);
  }, []);

  const authedFetch = React.useCallback(
    async (path: string, init: RequestInit = {}): Promise<Response> => {
      const tokens = await loadTokens();
      const url = path.startsWith('http') ? path : `${config.apiBaseUrl}${path}`;
      const withAuth = (accessToken: string): RequestInit => ({
        ...init,
        headers: {
          ...(init.headers ?? {}),
          Authorization: `Bearer ${accessToken}`,
          ...(init.body && !(init.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
        },
      });
      let res = await fetch(url, withAuth(tokens?.accessToken ?? ''));
      if (res.status === 401) {
        const refreshed = await refreshTokens();
        if (refreshed) {
          res = await fetch(url, withAuth(refreshed.accessToken));
        } else {
          await signOut();
        }
      }
      return res;
    },
    [signOut],
  );

  const value = React.useMemo(
    () => ({ user, loading, sendCode, verifyCode, signOut, authedFetch, refreshSession: hydrate }),
    [user, loading, sendCode, verifyCode, signOut, authedFetch, hydrate],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
```

- [ ] **Step 2: Delete the mock session context and mock auth service**

```bash
cd /c/Users/busie/mcloud-1
git rm apps/nuru/context/SessionContext.tsx apps/nuru/services/auth.ts
```
(These are replaced by AuthContext. Screens importing them are fixed in Tasks 4–5. `services/{notes,chat,client}.ts` stay.)

- [ ] **Step 3: Typecheck (expect errors from now-broken imports)**

```bash
cd apps/nuru && npx tsc --noEmit
```
Expected: FAILS with "Cannot find module '@/context/SessionContext'" / "'@/services/auth'" from `app/_layout.tsx`, `app/(auth)/login.tsx`, `app/(auth)/signup.tsx`, `app/(tabs)/profile.tsx`, `components/DrawerContent.tsx`. This is expected — Tasks 4–5 fix these call sites. Note the list of failing files.

- [ ] **Step 4: Commit**

```bash
cd /c/Users/busie/mcloud-1
git add apps/nuru/context/AuthContext.tsx
git commit -m "feat(nuru): port magic-code AuthContext from apps/mobile (WIP: call sites next)"
```

---

## Task 4: Rewire the login screen to magic-code; remove signup

**Files:**
- Modify: `apps/nuru/app/(auth)/login.tsx` (two-step email→code, calls useAuth)
- Delete: `apps/nuru/app/(auth)/signup.tsx` (magic-code is sign-in AND sign-up in one flow)
- Modify: `apps/nuru/components/authStyles.ts` (add code-input + resend styles)

**Interfaces:**
- Consumes: `useAuth()` from `@/context/AuthContext`; `Screen`, `Brand`, `Button` components; `theme`, `authStyles`.
- Produces: a login screen that drives `sendCode` then `verifyCode`; on success the guard (Task 5) redirects.

- [ ] **Step 1: Add code-input styles to authStyles**

Append two style keys to the `StyleSheet.create({ ... })` object in `apps/nuru/components/authStyles.ts` (keep existing `wrap`, `hero`, `input`, `error`, `link`):
```typescript
  codeInput: {
    textAlign: 'center',
    letterSpacing: 8,
    fontSize: 24,
    fontWeight: '700',
  },
  changeLink: {
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
    fontSize: 14,
  },
```
(These reference `theme` which is already imported in that file.)

- [ ] **Step 2: Rewrite login.tsx as the two-step magic-code screen**

`apps/nuru/app/(auth)/login.tsx`:
```tsx
import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import { Brand } from '@/components/Brand';
import { useAuth } from '@/context/AuthContext';
import { theme } from '@/theme';
import { authStyles } from '@/components/authStyles';

type Step = 'email' | 'code';

export default function Login() {
  const { sendCode, verifyCode } = useAuth();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const codeValid = code.trim().length >= 6;

  async function onSendCode() {
    setError(null);
    setBusy(true);
    try {
      await sendCode(email.trim());
      setStep('code');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onVerify() {
    setError(null);
    setBusy(true);
    try {
      await verifyCode(email.trim(), code.trim());
      // Success flips auth state; the root guard redirects to (tabs).
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function onChangeEmail() {
    setStep('email');
    setCode('');
    setError(null);
  }

  return (
    <Screen>
      <View style={authStyles.wrap}>
        <View style={authStyles.hero}>
          <Brand size="lg" withLogo tagline={step === 'email' ? 'Talk to your notes.' : 'Check your email.'} />
        </View>

        {step === 'email' ? (
          <>
            <TextInput
              placeholder="you@example.com"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              inputMode="email"
              value={email}
              onChangeText={setEmail}
              editable={!busy}
              onSubmitEditing={() => emailValid && onSendCode()}
              style={authStyles.input}
              placeholderTextColor={theme.colors.textMuted}
            />
            {error && <Text style={authStyles.error}>{error}</Text>}
            <Button title="Send code" onPress={onSendCode} loading={busy} />
          </>
        ) : (
          <>
            <Text style={[theme.typography.muted, { textAlign: 'center' }]}>
              We sent a 6-digit code to {email.trim()}.
            </Text>
            <TextInput
              placeholder="123456"
              keyboardType="number-pad"
              inputMode="numeric"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              maxLength={6}
              autoFocus
              value={code}
              onChangeText={(v) => setCode(v.replace(/[^0-9]/g, '').slice(0, 6))}
              editable={!busy}
              onSubmitEditing={() => codeValid && onVerify()}
              style={[authStyles.input, authStyles.codeInput]}
              placeholderTextColor={theme.colors.textMuted}
            />
            {error && <Text style={authStyles.error}>{error}</Text>}
            <Button title="Sign in" onPress={onVerify} loading={busy} />
            <Text onPress={busy ? undefined : onChangeEmail} style={authStyles.changeLink}>
              Use a different email
            </Text>
          </>
        )}
      </View>
    </Screen>
  );
}
```

- [ ] **Step 3: Delete signup screen**

```bash
cd /c/Users/busie/mcloud-1
git rm apps/nuru/app/(auth)/signup.tsx
```
(Magic-code covers sign-up: a new email just receives a code. The `(auth)/_layout.tsx` Stack no longer needs a signup route; it renders whatever routes exist, so no edit required.)

- [ ] **Step 4: Typecheck (login should be clean; remaining errors are Task 5's)**

```bash
cd apps/nuru && npx tsc --noEmit
```
Expected: no errors from `app/(auth)/login.tsx` or `authStyles.ts`. Remaining errors only from `app/_layout.tsx`, `app/(tabs)/profile.tsx`, `components/DrawerContent.tsx` (still importing the deleted `SessionContext`) — fixed in Task 5.

- [ ] **Step 5: Commit**

```bash
cd /c/Users/busie/mcloud-1
git add apps/nuru/app/\(auth\)/login.tsx apps/nuru/components/authStyles.ts
git commit -m "feat(nuru): magic-code login screen (email -> code); drop signup"
```

---

## Task 5: Wire AuthProvider + guard into the root; fix remaining consumers

**Files:**
- Modify: `apps/nuru/app/_layout.tsx` (wrap in AuthProvider, guard on useAuth)
- Modify: `apps/nuru/app/(tabs)/profile.tsx` (use useAuth instead of useSession)
- Modify: `apps/nuru/components/DrawerContent.tsx` (use useAuth instead of useSession)

**Interfaces:**
- Consumes: `AuthProvider`, `useAuth` from `@/context/AuthContext`.
- Produces: an app where unauthenticated users see the login screen and authenticated users see the `(tabs)` drawer; sign-out returns to login.

- [ ] **Step 1: Rewrite the root layout with AuthProvider + guard**

`apps/nuru/app/_layout.tsx` (replaces the SessionProvider version; keeps font loading, StatusBar, GestureHandlerRootView, dark Stack, and the `note/[id]` header):
```tsx
import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  Fraunces_500Medium,
  Fraunces_600SemiBold,
} from '@expo-google-fonts/fraunces';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { theme } from '@/theme';

function Loading() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', backgroundColor: theme.colors.bg }}>
      <ActivityIndicator color={theme.colors.primary} />
    </View>
  );
}

function Guard() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === '(auth)';
    if (!user && !inAuth) router.replace('/(auth)/login');
    else if (user && inAuth) router.replace('/(tabs)');
  }, [user, loading, segments]);

  if (loading) return <Loading />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.bg },
      }}
    >
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="note/[id]"
        options={{
          headerShown: true,
          title: 'Note',
          headerStyle: { backgroundColor: theme.colors.bg },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Fraunces_500Medium, Fraunces_600SemiBold });
  if (!fontsLoaded) return <Loading />;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <StatusBar style="light" />
        <Guard />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
```

- [ ] **Step 2: Update profile.tsx to use useAuth**

In `apps/nuru/app/(tabs)/profile.tsx`, change the import and the hook usage. Replace the import line:
```tsx
import { useSession } from '@/context/SessionContext';
```
with:
```tsx
import { useAuth } from '@/context/AuthContext';
```
and replace:
```tsx
  const { user, setUser } = useSession();
```
with:
```tsx
  const { user, signOut } = useAuth();
```
Then update `signOut` handler — replace the existing body of the profile's sign-out function:
```tsx
  async function signOut() {
    await auth.logout();
    setUser(null);
    router.replace('/(auth)/login');
  }
```
with a renamed handler that calls the context (avoid shadowing the `signOut` from context):
```tsx
  async function handleSignOut() {
    await signOut();
    router.replace('/(auth)/login');
  }
```
And update the sign-out `Button`'s `onPress` from `signOut` to `handleSignOut`. Remove the now-unused `import { auth } from '@/services/auth';` line.

- [ ] **Step 3: Update DrawerContent.tsx to use useAuth**

In `apps/nuru/components/DrawerContent.tsx`, replace:
```tsx
import { useSession } from '@/context/SessionContext';
```
with:
```tsx
import { useAuth } from '@/context/AuthContext';
```
and replace:
```tsx
  const { user } = useSession();
```
with:
```tsx
  const { user } = useAuth();
```

- [ ] **Step 4: Typecheck (now fully green)**

```bash
cd apps/nuru && npx tsc --noEmit
```
Expected: exit 0, no errors. If `services/auth` is still referenced anywhere, grep and fix:
```bash
cd apps/nuru && grep -rn "SessionContext\|services/auth" app components context 2>/dev/null || echo "clean"
```
Expected: `clean` (no remaining references).

- [ ] **Step 5: Commit**

```bash
cd /c/Users/busie/mcloud-1
git add apps/nuru/app/_layout.tsx apps/nuru/app/\(tabs\)/profile.tsx apps/nuru/components/DrawerContent.tsx
git commit -m "feat(nuru): wire AuthProvider + guard; move profile/drawer to useAuth"
```

---

## Task 6: End-to-end verification on web against local apps/web

**Files:** none (verification task).

**Interfaces:** Consumes the whole app; confirms the login round-trip.

- [ ] **Step 1: Start the backend (apps/web) locally**

In one shell, from `c:\Users\busie\mcloud-1`:
```bash
cd apps/web && npm run dev
```
Expected: Next.js dev server on `http://localhost:3000`. Confirm `/api/mobile/me` responds (401 without a token is correct):
```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/mobile/me
```
Expected: `401`.

- [ ] **Step 2: Start apps/nuru on web**

In another shell:
```bash
cd apps/nuru && npx expo start --web --port 8082
```
Expected: bundles cleanly, serves `http://localhost:8082` (HTTP 200). If any bundling error mentions a missing module, resolve before proceeding.

- [ ] **Step 3: Drive the login screen (headless) — up to send-code**

Using the headless-chromium screenshot approach (playwright-core + the cached chromium at `~/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe`), load `http://localhost:8082`, confirm the login screen renders (Nuru wordmark + email field + "Send code"). Fill a real email you control, click "Send code", and assert the UI advances to the code-entry step (the "123456" field + "Sign in" + "Use a different email" appear). Capture a screenshot of each step. Confirm no console/page errors.

Expected: `send-code` returns 200 (a code is emailed), the screen advances to code entry.

- [ ] **Step 4: Complete the round-trip with a user-relayed code**

The 6-digit code is emailed to the address entered. Ask the user for the code, enter it in the code field, click "Sign in". Assert: `verify` returns tokens, the app redirects off `(auth)` to the `(tabs)` Chat screen (drawer app), and the drawer footer shows the signed-in user's email. Capture a screenshot of the authenticated Chat screen and of the open drawer showing the user.

Expected: authenticated app renders; `/api/mobile/me` resolved the user.

- [ ] **Step 5: Verify sign-out returns to login**

Open the drawer → Profile → "Sign out". Assert the app returns to the login screen (email step).

Expected: back at login; secure-store tokens cleared.

- [ ] **Step 6: Final typecheck + commit any verification fixes**

```bash
cd apps/nuru && npx tsc --noEmit
```
Expected: exit 0. If verification surfaced a fix, commit it:
```bash
cd /c/Users/busie/mcloud-1
git add -A
git commit -m "fix(nuru): <describe> found during end-to-end auth verification"
```
If nothing needed fixing, no commit.

---

## Notes on verification approach

There is no automated test suite this slice (behavior beyond auth is still mocked; consistent with the scaffold's `tsc` + manual click-through model). Every task ends on `npx tsc --noEmit` (strict, run from `apps/nuru`). Task 6 is the integration gate: the full magic-code round-trip against a locally-running `apps/web`, with the user relaying the emailed code once. Automated tests arrive with the real notes/chat data endpoints in a later slice.
