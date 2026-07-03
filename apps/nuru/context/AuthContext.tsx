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
