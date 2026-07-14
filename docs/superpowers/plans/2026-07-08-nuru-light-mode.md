# Nuru Light Mode + Teal Rebrand Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a light theme as the default for the Nuru Expo app, adopt the logo's teal as the primary brand color, and let the user switch System / Light / Dark live in Settings.

**Architecture:** Replace the single static `theme` object with a `makeTheme(scheme)` factory exporting light + dark palettes of identical shape. A new `ThemeProvider` resolves the active scheme (stored preference → system → light) and exposes `useTheme()`. Every styled file converts its module-level `StyleSheet.create` into a `makeStyles(theme)` factory called via `useMemo` inside the component, so a theme change re-renders styles live.

**Tech Stack:** Expo SDK 57, React Native 0.86, expo-router, TypeScript, expo-secure-store (persistence), `useColorScheme` from react-native.

## Global Constraints

- App scope: `apps/nuru` only. Do not touch other apps.
- Light is the **default** scheme; resolution order is `stored pref → if 'system'/unset then useColorScheme() → fallback 'light'`.
- `primary` **diverges by mode**: teal `#14505F` in light, amber `#FF9800` in dark. Never assume a single primary.
- Whites are warm: `bg #F7F6F3`, cards `#FFFFFF`, AI bubble `#FAFAF7`. No pure-white full-screen surface.
- `textMuted` is metadata-only (timestamps, token counts, captions) — never instructional text.
- `success` (`#3DAA6E` light / `#5CC98C` dark) means completed/correct; `accent` (amber light / teal dark) is decorative only. Keep the roles distinct. No reward UI is built in this plan — only the token is defined.
- Secure-store key: `nuru.theme.pref`. Stored value is the preference (`system`|`light`|`dark`), not the resolved scheme.
- Preserve every existing spacing/radii/typography value; only `color` fields become theme-resolved.
- No automated test framework exists; this app has no `jest`/`@testing-library`. Verification is `npx tsc --noEmit` (type-check) plus manual observation in the running app. Do **not** add a test runner.
- Brand mark follows the palette: **teal logo in light, amber logo in dark**. `Logo.tsx` selects the asset from the active scheme. The amber mark already exists as `assets/images/splash-icon.png`; the teal mark must be added as `assets/images/logo-teal.png` (a prerequisite for Task 9, supplied by the user).

---

### Task 1: Theme factory — light + dark palettes

Rewrite `theme/index.ts` from a single static palette into a factory that produces either scheme. This is the foundation every other task consumes.

**Files:**
- Modify: `apps/nuru/theme/index.ts` (full rewrite)

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type Scheme = 'light' | 'dark'`
  - `const lightColors: Colors`, `const darkColors: Colors` where `Colors` is the object shape below
  - `function makeTheme(scheme: Scheme): Theme`
  - `type Theme = { colors: Colors; spacing: ...; radii: ...; fonts: ...; typography: ... }`
  - `const theme: Theme` (= `makeTheme('light')`) — transitional default export so any not-yet-migrated import still type-checks.

- [ ] **Step 1: Rewrite `theme/index.ts`**

Replace the entire file with:

```ts
// Nuru — dual light/dark theme. "Nuru" means light in Swahili. Teal (the logo
// color) leads in light mode; amber leads in dark, where teal has too little
// contrast on charcoal. Fraunces serif carries the brand voice; the system sans
// does the quiet UI work.

export type Scheme = 'light' | 'dark';

export type Colors = {
  bg: string;
  surface: string;
  surfaceAlt: string;
  primary: string;
  primarySoft: string;
  accent: string;
  text: string;
  textMuted: string;
  border: string;
  danger: string;
  success: string;
  onPrimary: string;
  bubbleUser: string;
  bubbleAi: string;
};

export const lightColors: Colors = {
  bg: '#F7F6F3',          // warm paper — not pure white
  surface: '#FFFFFF',     // white cards lift over paper
  surfaceAlt: '#ECEAE5',  // pressed / active
  primary: '#14505F',     // logo teal — brand + actions
  primarySoft: '#DCEAEE', // teal-tinted chips
  accent: '#C77D28',      // amber secondary
  text: '#1C2B30',        // teal-ink (not pure black)
  textMuted: '#5E6E73',   // metadata only
  border: '#E3E0DA',      // hairline
  danger: '#C4553B',      // errors
  success: '#3DAA6E',     // correct / completion
  onPrimary: '#FFFFFF',   // text on teal fills
  bubbleUser: '#14505F',  // user bubble (teal)
  bubbleAi: '#FAFAF7',    // assistant bubble (warm white)
};

export const darkColors: Colors = {
  bg: '#262624',          // flat neutral charcoal
  surface: '#302F2D',     // raised cards / input bar
  surfaceAlt: '#3A3937',  // pressed / active
  primary: '#FF9800',     // amber — primary on charcoal
  primarySoft: '#3A2A14', // amber-tinted chips
  accent: '#4F9DB5',      // teal secondary
  text: '#EDE7E1',        // warm off-white
  textMuted: '#9B8F85',   // taupe
  border: '#403F3C',      // hairline
  danger: '#E0876F',      // desaturated coral
  success: '#5CC98C',     // correct / completion
  onPrimary: '#1A1204',   // near-black on amber fills
  bubbleUser: '#FF9800',  // user bubble (amber)
  bubbleAi: '#302F2D',    // assistant bubble (raised surface)
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
export const radii = { sm: 8, md: 14, lg: 22, pill: 999 };

// Font family names registered in app/_layout.tsx via useFonts().
export const fonts = {
  display: 'Fraunces_600SemiBold',
  displayLight: 'Fraunces_500Medium',
};

export function makeTypography(colors: Colors) {
  return {
    // Serif — brand wordmark and screen titles only.
    brand: { fontFamily: fonts.display, fontSize: 40, color: colors.text, letterSpacing: 0.5 },
    title: { fontFamily: fonts.display, fontSize: 26, color: colors.text },
    // Sans — everything else.
    heading: { fontSize: 18, fontWeight: '600' as const, color: colors.text },
    body: { fontSize: 16, color: colors.text },
    muted: { fontSize: 14, color: colors.textMuted },
  };
}

export function makeTheme(scheme: Scheme) {
  const colors = scheme === 'dark' ? darkColors : lightColors;
  return { colors, spacing, radii, fonts, typography: makeTypography(colors) };
}

export type Theme = ReturnType<typeof makeTheme>;

// Transitional default: modules not yet migrated to useTheme() still resolve
// against a valid (light) theme so the app type-checks during migration.
export const theme: Theme = makeTheme('light');
```

- [ ] **Step 2: Type-check**

Run: `cd apps/nuru && npx tsc --noEmit`
Expected: PASS (0 errors). Every existing `theme.colors.x` / `theme.typography.x` still resolves against the transitional default export, and the new `success` key exists on both palettes.

- [ ] **Step 3: Commit**

```bash
git add apps/nuru/theme/index.ts
git commit -m "feat(nuru): theme factory with light + dark palettes"
```

---

### Task 2: ThemeProvider + useTheme hook

Create the context that resolves the active scheme, persists the preference, and exposes `useTheme()`. Nothing consumes it yet — that's fine; it must type-check and be wired in Task 3.

**Files:**
- Create: `apps/nuru/context/ThemeContext.tsx`

**Interfaces:**
- Consumes: `makeTheme`, `type Theme`, `type Scheme` from `@/theme`.
- Produces:
  - `type Pref = 'system' | 'light' | 'dark'`
  - `function ThemeProvider({ children }: PropsWithChildren): JSX.Element`
  - `function useTheme(): { theme: Theme; scheme: Scheme; pref: Pref; setPref: (p: Pref) => void }`

- [ ] **Step 1: Create `context/ThemeContext.tsx`**

```tsx
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  PropsWithChildren,
} from 'react';
import { useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { makeTheme, Scheme, Theme } from '@/theme';

export type Pref = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'nuru.theme.pref';

type ThemeContextValue = {
  theme: Theme;
  scheme: Scheme;
  pref: Pref;
  setPref: (p: Pref) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveScheme(pref: Pref, system: Scheme): Scheme {
  if (pref === 'light') return 'light';
  if (pref === 'dark') return 'dark';
  return system; // 'system'
}

export function ThemeProvider({ children }: PropsWithChildren) {
  // system may be null before the OS reports; default to light per the spec.
  const system: Scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const [pref, setPrefState] = useState<Pref>('system');

  // Load the persisted preference once on mount.
  useEffect(() => {
    (async () => {
      const stored = await SecureStore.getItemAsync(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setPrefState(stored);
      }
    })();
  }, []);

  function setPref(p: Pref) {
    setPrefState(p);
    // Fire-and-forget persistence; UI already reflects the new pref.
    SecureStore.setItemAsync(STORAGE_KEY, p).catch(() => {});
  }

  const scheme = resolveScheme(pref, system);
  const theme = useMemo(() => makeTheme(scheme), [scheme]);

  const value = useMemo(
    () => ({ theme, scheme, pref, setPref }),
    [theme, scheme, pref],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
```

- [ ] **Step 2: Type-check**

Run: `cd apps/nuru && npx tsc --noEmit`
Expected: PASS (0 errors).

- [ ] **Step 3: Commit**

```bash
git add apps/nuru/context/ThemeContext.tsx
git commit -m "feat(nuru): ThemeProvider + useTheme with system/light/dark resolution"
```

---

### Task 3: Wire the provider + reactive status bar in root layout

Mount `ThemeProvider` above the app and drive the status bar + Stack/header backgrounds from the active theme via the hook. After this task the app runs light by default even though individual components still read the static default export (they'll be migrated next).

**Files:**
- Modify: `apps/nuru/app/_layout.tsx`

**Interfaces:**
- Consumes: `ThemeProvider`, `useTheme` from `@/context/ThemeContext`; `scheme` drives `<StatusBar style>`.
- Produces: nothing new; establishes that `useTheme()` is available to the whole tree.

- [ ] **Step 1: Rewrite `app/_layout.tsx`**

The `Loading` and `Guard` functions must read `useTheme()` instead of the static import; `RootLayout` wraps everything in `ThemeProvider` (inside `AuthProvider` is fine — order doesn't matter) and renders a `<ThemedStatusBar/>` that reads the scheme.

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
import { ThemeProvider, useTheme } from '@/context/ThemeContext';

function Loading() {
  const { theme } = useTheme();
  return (
    <View style={{ flex: 1, justifyContent: 'center', backgroundColor: theme.colors.bg }}>
      <ActivityIndicator color={theme.colors.primary} />
    </View>
  );
}

function ThemedStatusBar() {
  const { scheme } = useTheme();
  // Light UI → dark status-bar content; dark UI → light content.
  return <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />;
}

function Guard() {
  const { user, loading } = useAuth();
  const { theme } = useTheme();
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
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AuthProvider>
          <ThemedStatusBar />
          {fontsLoaded ? <Guard /> : <Loading />}
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
```

Note: `Loading` now needs the provider, so the early `if (!fontsLoaded) return <Loading/>` was moved *inside* the provider tree (rendered as `{fontsLoaded ? <Guard/> : <Loading/>}`).

- [ ] **Step 2: Type-check**

Run: `cd apps/nuru && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Manual smoke — app boots light**

Run the app (`npx expo start`, open on device/emulator). Expected: app renders on warm-paper background with a dark status bar; no crash from `useTheme`. (Components still show some teal/amber from the static default — full color correctness comes after Task 4+.)

- [ ] **Step 4: Commit**

```bash
git add apps/nuru/app/_layout.tsx
git commit -m "feat(nuru): mount ThemeProvider + reactive status bar"
```

---

### Task 4: Migrate `authStyles.ts` to a factory (shared helper)

`authStyles.ts` is a bare exported `StyleSheet` with no component. Convert it to `makeAuthStyles(theme)` so its consumers (`login.tsx`) can build it reactively. Done before the screens so the screen tasks can consume it.

**Files:**
- Modify: `apps/nuru/components/authStyles.ts`

**Interfaces:**
- Consumes: `type Theme` from `@/theme`.
- Produces: `function makeAuthStyles(theme: Theme)` returning the same style keys as today: `wrap, hero, input, error, link, codeInput, changeLink`.

- [ ] **Step 1: Rewrite `components/authStyles.ts`**

```ts
import { StyleSheet } from 'react-native';
import { Theme } from '@/theme';

export function makeAuthStyles(theme: Theme) {
  return StyleSheet.create({
    wrap: { flex: 1, justifyContent: 'center', gap: theme.spacing.md },
    hero: { alignItems: 'center', marginBottom: theme.spacing.xl },
    input: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radii.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      fontSize: 16,
      color: theme.colors.text,
    },
    error: { color: theme.colors.danger, textAlign: 'center' },
    link: {
      color: theme.colors.accent,
      textAlign: 'center',
      marginTop: theme.spacing.md,
      fontSize: 15,
    },
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
  });
}
```

- [ ] **Step 2: Type-check (expect one downstream error to fix in Task 5)**

Run: `cd apps/nuru && npx tsc --noEmit`
Expected: FAIL — `login.tsx` still imports the old `authStyles` named export. This is expected; Task 5 fixes it. If you are running tasks strictly independently, temporarily leave a compatibility export: append `export const authStyles = makeAuthStyles(makeTheme('light'));` — but the cleaner path is to do Task 5 immediately after and skip the shim.

- [ ] **Step 3: Commit**

```bash
git add apps/nuru/components/authStyles.ts
git commit -m "refactor(nuru): authStyles -> makeAuthStyles(theme) factory"
```

---

### Task 5: Migrate leaf presentational components

Convert every component whose only theme use is styling. Each follows the **identical mechanical transform** below. They are grouped in one task because the transform is uniform and they share no interface changes; commit once at the end.

**The transform (apply to each file):**
1. Add `import { useMemo } from 'react';` (merge into existing react import).
2. Replace `import { theme } from '@/theme';` with `import { Theme } from '@/theme';` and `import { useTheme } from '@/context/ThemeContext';`.
3. Rename the module-level `const styles = StyleSheet.create({...})` to `function makeStyles(theme: Theme) { return StyleSheet.create({...}); }` (body unchanged).
4. Inside the component body add: `const { theme } = useTheme();` then `const styles = useMemo(() => makeStyles(theme), [theme]);`.
5. Any JSX that referenced `theme.colors.x` / `theme.typography.x` / `theme.spacing.x` directly now uses the hook's `theme` (already in scope) — no import change needed since `theme` is the local const.

**Files (all in `apps/nuru/components/`):**
- Modify: `Screen.tsx`, `Brand.tsx`, `Button.tsx`, `ChatBubble.tsx`, `ChatInputBar.tsx`, `ChatOptionsModal.tsx`, `AttachMenu.tsx`, `BottomDrawer.tsx`, `DrawerContent.tsx`, `EmptyState.tsx`, `Markdown.tsx`, `NoteCard.tsx`, `ThinkingIndicator.tsx`, `AddNoteSheet.tsx`

**Interfaces:**
- Consumes: `useTheme` from `@/context/ThemeContext`; `type Theme` from `@/theme`.
- Produces: no API change to any component's props.

- [ ] **Step 1: Transform `Screen.tsx`**

```tsx
import { SafeAreaView, View, KeyboardAvoidingView, StyleSheet } from 'react-native';
import { PropsWithChildren, useMemo } from 'react';
import { Theme } from '@/theme';
import { useTheme } from '@/context/ThemeContext';

/** (keep the existing doc comment) */
export function Screen({
  children,
  keyboardAvoiding = false,
  keyboardOffset = 0,
}: PropsWithChildren<{ keyboardAvoiding?: boolean; keyboardOffset?: number }>) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const inner = <View style={styles.inner}>{children}</View>;
  return (
    <SafeAreaView style={styles.safe}>
      {keyboardAvoiding ? (
        <KeyboardAvoidingView
          style={styles.fill}
          behavior="padding"
          keyboardVerticalOffset={keyboardOffset}
        >
          {inner}
        </KeyboardAvoidingView>
      ) : (
        inner
      )}
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.colors.bg },
    fill: { flex: 1 },
    inner: { flex: 1, padding: theme.spacing.md },
  });
}
```

- [ ] **Step 2: Transform `Button.tsx`**

Note the two inline `theme.colors.*` uses in the `ActivityIndicator` — they resolve to the hook's local `theme`.

```tsx
import { Pressable, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useMemo } from 'react';
import { Theme } from '@/theme';
import { useTheme } from '@/context/ThemeContext';

type Props = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost';
  loading?: boolean;
};
export function Button({ title, onPress, variant = 'primary', loading }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const ghost = variant === 'ghost';
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [
        styles.base,
        ghost ? styles.ghost : styles.primary,
        pressed && !loading && { opacity: 0.85 },
        loading && { opacity: 0.6 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={ghost ? theme.colors.primary : theme.colors.onPrimary} />
      ) : (
        <Text style={[styles.text, ghost && styles.ghostText]}>{title}</Text>
      )}
    </Pressable>
  );
}
function makeStyles(theme: Theme) {
  return StyleSheet.create({
    base: { paddingVertical: theme.spacing.md, borderRadius: theme.radii.pill, alignItems: 'center' },
    primary: { backgroundColor: theme.colors.primary },
    ghost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.colors.border },
    text: { color: theme.colors.onPrimary, fontSize: 16, fontWeight: '600' },
    ghostText: { color: theme.colors.text },
  });
}
```

- [ ] **Step 3: Transform `Brand.tsx`**

Inline JSX uses `theme.typography.brand` and `theme.typography.muted`; these become the hook's `theme`.

```tsx
import { View, Text, StyleSheet } from 'react-native';
import { useMemo } from 'react';
import { Logo } from '@/components/Logo';
import { Theme } from '@/theme';
import { useTheme } from '@/context/ThemeContext';

/** (keep the existing doc comment) */
export function Brand({
  size = 'lg',
  withLogo = false,
  tagline,
}: {
  size?: 'lg' | 'sm';
  withLogo?: boolean;
  tagline?: string;
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const fontSize = size === 'lg' ? 44 : 28;
  return (
    <View style={styles.wrap}>
      {withLogo && <Logo size={size === 'lg' ? 72 : 40} />}
      <Text style={[theme.typography.brand, { fontSize }]}>Nuru</Text>
      {tagline && <Text style={[theme.typography.muted, styles.tagline]}>{tagline}</Text>}
    </View>
  );
}
function makeStyles(theme: Theme) {
  return StyleSheet.create({
    wrap: { alignItems: 'center', gap: theme.spacing.md },
    tagline: { letterSpacing: 0.3 },
  });
}
```

- [ ] **Step 4: Transform the remaining components with the same mechanical transform**

Apply steps 1–5 of "The transform" to each of: `ChatBubble.tsx`, `ChatInputBar.tsx`, `ChatOptionsModal.tsx`, `AttachMenu.tsx`, `BottomDrawer.tsx`, `DrawerContent.tsx`, `EmptyState.tsx`, `Markdown.tsx`, `NoteCard.tsx`, `ThinkingIndicator.tsx`, `AddNoteSheet.tsx`.

For each: move `const styles = StyleSheet.create({...})` into `function makeStyles(theme: Theme) { return StyleSheet.create({...}); }`, add `const { theme } = useTheme();` + `const styles = useMemo(() => makeStyles(theme), [theme]);` at the top of the component, swap the theme import to `import { Theme } from '@/theme'; import { useTheme } from '@/context/ThemeContext';`, and add `useMemo` to the react import. Any inline `theme.colors.*` / `theme.typography.*` in JSX now resolves to the hook's local `theme`.

Watch for: a file may reference `theme.*` in a callback or a `renderItem` — those are still inside the component scope, so the local `theme` covers them. If a helper is defined *outside* the component and needs colors, pass `theme` in as a parameter.

- [ ] **Step 5: Type-check**

Run: `cd apps/nuru && npx tsc --noEmit`
Expected: PASS (0 errors) once every listed component is migrated. Remaining screen files (`login`, tabs, `note/[id]`) still use the static default export and continue to type-check.

- [ ] **Step 6: Commit**

```bash
git add apps/nuru/components
git commit -m "refactor(nuru): components read theme reactively via useTheme"
```

---

### Task 6: Migrate the screens (`login`, tabs index/notes, note detail)

Same mechanical transform as Task 5, applied to the route screens. `login.tsx` additionally consumes `makeAuthStyles(theme)` from Task 4. `profile.tsx` is intentionally excluded here — it gets the Settings control in Task 7.

**Files:**
- Modify: `apps/nuru/app/(auth)/login.tsx`, `apps/nuru/app/(tabs)/index.tsx`, `apps/nuru/app/(tabs)/notes.tsx`, `apps/nuru/app/(tabs)/_layout.tsx`, `apps/nuru/app/note/[id].tsx`

**Interfaces:**
- Consumes: `useTheme` from `@/context/ThemeContext`; `makeAuthStyles` from `@/components/authStyles` (login only).
- Produces: no route/prop changes.

- [ ] **Step 1: Migrate `login.tsx`**

Swap `import { authStyles } from '@/components/authStyles'` for `import { makeAuthStyles } from '@/components/authStyles'`, add `useTheme`, and inside the component: `const { theme } = useTheme(); const authStyles = useMemo(() => makeAuthStyles(theme), [theme]);`. If the file also has its own `const styles = StyleSheet.create(...)`, apply the standard `makeStyles(theme)` transform to it too. Replace any inline `theme.colors.*` with the hook's `theme`.

- [ ] **Step 2: Migrate `(tabs)/index.tsx`, `(tabs)/notes.tsx`, `note/[id].tsx`**

Apply the standard Task 5 transform (module `styles` → `makeStyles(theme)` + `useTheme` + `useMemo`) to each.

- [ ] **Step 3: Migrate `(tabs)/_layout.tsx` (tab bar colors)**

The tab navigator sets colors via `screenOptions` (e.g. `tabBarActiveTintColor: theme.colors.primary`). Read `const { theme } = useTheme();` in the layout component and reference the hook's `theme` in `screenOptions`. No `makeStyles` needed if it has no `StyleSheet`.

- [ ] **Step 4: Type-check**

Run: `cd apps/nuru && npx tsc --noEmit`
Expected: PASS (0 errors).

- [ ] **Step 5: Commit**

```bash
git add "apps/nuru/app/(auth)/login.tsx" "apps/nuru/app/(tabs)/index.tsx" "apps/nuru/app/(tabs)/notes.tsx" "apps/nuru/app/(tabs)/_layout.tsx" "apps/nuru/app/note/[id].tsx"
git commit -m "refactor(nuru): route screens read theme reactively"
```

---

### Task 7: Settings — System / Light / Dark segmented control

Replace the placeholder `dark` `Switch` in `profile.tsx` with a three-way segmented control bound to `useTheme().setPref`, and migrate the screen to the reactive theme.

**Files:**
- Modify: `apps/nuru/app/(tabs)/profile.tsx`

**Interfaces:**
- Consumes: `useTheme`, `type Pref` from `@/context/ThemeContext`.
- Produces: no new exports.

- [ ] **Step 1: Rewrite `profile.tsx`**

Remove `useState`-based `dark` placeholder and the `Switch`; add a segmented control. Full file:

```tsx
import { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import { useAuth } from '@/context/AuthContext';
import { useTheme, Pref } from '@/context/ThemeContext';
import { Theme } from '@/theme';

const OPTIONS: { label: string; value: Pref }[] = [
  { label: 'System', value: 'system' },
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
];

export default function Profile() {
  const { user, signOut } = useAuth();
  const { theme, pref, setPref } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.replace('/(auth)/login');
  }

  return (
    <Screen>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{(user?.name?.[0] ?? 'S').toUpperCase()}</Text>
      </View>
      <Text style={[theme.typography.title, { textAlign: 'center' }]}>{user?.name ?? 'Student'}</Text>
      <Text style={[theme.typography.muted, { textAlign: 'center', marginBottom: theme.spacing.xl }]}>
        {user?.email ?? ''}
      </Text>

      <Text style={[theme.typography.body, { marginBottom: theme.spacing.sm }]}>Appearance</Text>
      <View style={styles.segment}>
        {OPTIONS.map((opt) => {
          const active = pref === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => setPref(opt.value)}
              style={[styles.segmentItem, active && styles.segmentItemActive]}
            >
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={[theme.typography.muted, { marginTop: theme.spacing.sm, marginBottom: theme.spacing.xl }]}>
        System follows your device. Light is the default.
      </Text>

      <Button title="Sign out" variant="ghost" onPress={handleSignOut} />
    </Screen>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    avatar: {
      alignSelf: 'center', width: 84, height: 84, borderRadius: 42,
      backgroundColor: theme.colors.primarySoft, alignItems: 'center', justifyContent: 'center',
      marginTop: theme.spacing.lg, marginBottom: theme.spacing.md,
    },
    avatarText: { fontSize: 34, fontWeight: '700', color: theme.colors.primary },
    segment: {
      flexDirection: 'row', backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.md, borderWidth: 1, borderColor: theme.colors.border,
      padding: 3, gap: 3,
    },
    segmentItem: {
      flex: 1, paddingVertical: 10, borderRadius: theme.radii.sm, alignItems: 'center',
    },
    segmentItemActive: { backgroundColor: theme.colors.primary },
    segmentText: { fontSize: 15, fontWeight: '600', color: theme.colors.textMuted },
    segmentTextActive: { color: theme.colors.onPrimary },
  });
}
```

- [ ] **Step 2: Type-check**

Run: `cd apps/nuru && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add "apps/nuru/app/(tabs)/profile.tsx"
git commit -m "feat(nuru): System/Light/Dark appearance control in settings"
```

---

### Task 8: app.json — automatic UI style

Flip the native default so the OS doesn't force dark, and let the app's own resolution take over.

**Files:**
- Modify: `apps/nuru/app.json`

**Interfaces:** none.

- [ ] **Step 1: Change `userInterfaceStyle`**

In `apps/nuru/app.json`, change `"userInterfaceStyle": "dark"` to `"userInterfaceStyle": "automatic"`.

Leave the splash `backgroundColor` (`#262624`) and adaptive-icon `backgroundColor` (`#14110F`) as-is per the spec — a dark splash avoids a white flash before JS loads. Do not change them.

- [ ] **Step 2: Type-check + config sanity**

Run: `cd apps/nuru && npx tsc --noEmit`
Expected: PASS (JSON change doesn't affect TS, but confirms nothing else broke).

- [ ] **Step 3: Commit**

```bash
git add apps/nuru/app.json
git commit -m "chore(nuru): userInterfaceStyle automatic for light default"
```

---

### Task 9: Scheme-aware brand logo

Make `Logo.tsx` render the teal mark in light mode and the amber mark in dark, mirroring the palette. `Brand.tsx` (already migrated in Task 5) needs no change — it just calls `<Logo/>`.

**Prerequisite (user-supplied):** `apps/nuru/assets/images/logo-teal.png` must exist — the teal version of the sunburst, ideally the same pixel dimensions as `splash-icon.png` (~512×512). If it is missing, Metro throws an unresolved-asset error at bundle time; stop and obtain the asset before continuing.

**Files:**
- Modify: `apps/nuru/components/Logo.tsx`
- Add (user-supplied, not created by code): `apps/nuru/assets/images/logo-teal.png`

**Interfaces:**
- Consumes: `useTheme` from `@/context/ThemeContext`.
- Produces: no prop change to `Logo`.

- [ ] **Step 1: Confirm the asset exists**

Run: `ls apps/nuru/assets/images/logo-teal.png`
Expected: file listed. If "No such file", stop — the teal PNG must be added first.

- [ ] **Step 2: Rewrite `Logo.tsx` to pick the asset by scheme**

`require()` calls must be static literals (Metro cannot resolve a dynamic path), so require both assets up front and choose between them.

```tsx
import { Image, ImageStyle, StyleProp } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

const TEAL_LOGO = require('@/assets/images/logo-teal.png');
const AMBER_LOGO = require('@/assets/images/splash-icon.png');

/**
 * The Nuru sunburst — the brand's light mark. It follows the palette: the teal
 * mark in light mode, the amber mark in dark, matching the primary color of each
 * scheme. "Nuru" means light; this mark is the point of light the whole app
 * circles.
 */
export function Logo({ size = 64, style }: { size?: number; style?: StyleProp<ImageStyle> }) {
  const { scheme } = useTheme();
  return (
    <Image
      source={scheme === 'dark' ? AMBER_LOGO : TEAL_LOGO}
      style={[{ width: size, height: size }, style]}
      resizeMode="contain"
      accessibilityLabel="Nuru"
    />
  );
}
```

- [ ] **Step 3: Type-check**

Run: `cd apps/nuru && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Manual — logo swaps with scheme**

Launch, view a screen showing the logo (login or an empty state via `Brand withLogo`). Toggle Settings → Light/Dark.
Expected: teal mark in light, amber mark in dark, swapping live.

- [ ] **Step 5: Commit**

```bash
git add apps/nuru/components/Logo.tsx apps/nuru/assets/images/logo-teal.png
git commit -m "feat(nuru): scheme-aware brand logo (teal light / amber dark)"
```

---

### Task 10: Full manual verification pass

No code change — exercise the feature end-to-end in the running app and confirm the spec's five verification points. If any fails, fix the offending file (it will be a missed `makeStyles`/`useTheme` migration) and re-verify.

**Files:** none (may reopen prior files if a defect is found).

- [ ] **Step 1: Launch**

Run: `cd apps/nuru && npx expo start` and open on a device/emulator whose OS is set to **light**.
Expected: app is light — warm-paper background, teal primary buttons/user-bubble, dark status bar.

- [ ] **Step 2: Live switch to Dark**

Settings → Appearance → Dark.
Expected: app flips **immediately** (no restart) to charcoal background, amber primary/user-bubble, light status bar. Chat, notes, note detail, login (sign out to see it), drawer, attach menu all legible.

- [ ] **Step 3: System follow**

Settings → Appearance → System, then toggle the OS scheme (Android/iOS quick settings).
Expected: app follows the OS live.

- [ ] **Step 4: Persistence**

Set Dark, fully kill the app, relaunch.
Expected: app reopens in Dark (pref persisted via secure-store).

- [ ] **Step 5: Contrast spot-check both modes**

In each mode, verify: user bubble text legible on the bubble fill; muted metadata is only on timestamps/token counts (not instructions); borders visible but not harsh; the AI bubble reads as warm-white (light) not pure white; the brand logo is teal in light and amber in dark.
Expected: all pass. Fix any component still showing stale colors (indicates a missed migration).

- [ ] **Step 6: Final commit (if fixes were needed)**

```bash
git add apps/nuru
git commit -m "fix(nuru): resolve theme migration gaps found in verification"
```

(Skip if Steps 1–5 passed with no changes.)

---

## Notes for the implementer

- **Order matters for clean commits:** Tasks 1→2→3 build the engine; 4→5→6→7 migrate consumers; 8 flips the native default; 9 swaps the brand logo; 10 verifies. If you run tasks out of order, the transitional `export const theme` in Task 1 keeps unmigrated files compiling.
- **The transform is uniform.** Every styled file becomes: hook at top → `useMemo(makeStyles)` → `makeStyles(theme: Theme)` at the bottom. If a file diverges from that shape, re-read it — there's likely an inline `theme.*` in JSX or a module-level helper that needs `theme` passed in.
- **Don't add a test runner.** This app has none; verification is `npx tsc --noEmit` + the Task 10 manual pass.
