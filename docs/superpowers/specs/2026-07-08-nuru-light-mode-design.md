# Nuru — Light Mode + Teal Rebrand (design)

Date: 2026-07-08
App: `apps/nuru` (Expo SDK 56, expo-router, TypeScript)

## Goal

Add a **light theme as the default** for Nuru, a study-helper app, and adopt the
logo's deep teal-blue as the primary brand color. Light is the default; the app
follows the OS scheme when no explicit choice is made; the user can pin
System / Light / Dark in Settings and the change applies live (no restart).

Constraints from the brief:
- Whites must be easy on the eyes — no scorching pure-white surfaces, but no
  obvious color tint either. A soft warm paper.
- Light is default; dark remains available.

## Brand colors

- **Teal `#14505F`** — the logo color. Primary in light mode.
- **Amber `#FF9800`** — the app's existing accent. **Stays primary in dark mode**
  because teal has too little contrast on the charcoal background (~1.3:1). Each
  mode leads with the brand color that is legible on its own background and
  carries the other color as the secondary accent.

## Color palettes

Both palettes share the same shape (keys). `makeTheme(scheme)` returns the right
one. Values:

| key           | LIGHT (default)       | DARK (retained)        | notes |
|---------------|-----------------------|------------------------|-------|
| `bg`          | `#F7F6F3` warm paper  | `#262624` charcoal     | not pure white — barely-warm paper |
| `surface`     | `#FFFFFF` white cards | `#302F2D`              | cards step *up* to white for a gentle lift over paper |
| `surfaceAlt`  | `#ECEAE5`             | `#3A3937`              | pressed / active |
| `primary`     | `#14505F` teal        | `#FF9800` amber        | **diverges by mode** |
| `primarySoft` | `#DCEAEE` teal chip   | `#3A2A14` amber chip   | tinted chips |
| `accent`      | `#C77D28` amber       | `#4F9DB5` teal         | the "other" brand color as secondary |
| `text`        | `#1C2B30` teal-ink    | `#EDE7E1` warm off-white | dark desaturated teal, not pure black |
| `textMuted`   | `#5E6E73`             | `#9B8F85`              | |
| `border`      | `#E3E0DA`             | `#403F3C`              | hairline |
| `danger`      | `#C4553B`             | `#E0876F`              | errors |
| `onPrimary`   | `#FFFFFF`             | `#1A1204`              | text/icon on primary fills |
| `bubbleUser`  | `#14505F` teal        | `#FF9800` amber        | user chat bubble |
| `bubbleAi`    | `#FFFFFF`             | `#302F2D`              | assistant bubble |

Contrast (WCAG AA): teal on white ≈ 8:1, teal-ink on paper ≈ 11:1, white on teal
≈ 8:1, amber-on-near-black in dark unchanged from today.

`spacing`, `radii`, `fonts`, `typography` are unchanged in value, but
`typography` currently bakes `color` into its entries; those color fields will be
resolved from the active theme (see Architecture).

## Architecture — runtime theme switching

### The problem
Today `theme/index.ts` exports one static `colors` object, and every styled file
does `const styles = StyleSheet.create({ ...theme.colors.x })` at **module load**.
Colors bake in once at import, so a runtime toggle cannot re-style anything.

### The solution: theme factory + context hook + per-file `makeStyles`

**`theme/index.ts`**
- Export `lightColors` and `darkColors` (the table above).
- Export `spacing`, `radii`, `fonts` (unchanged).
- Export `makeTypography(colors)` — typography entries with `color` resolved from
  the passed palette (brand/title/heading/body use `colors.text`, muted uses
  `colors.textMuted`).
- Export `makeTheme(scheme: 'light' | 'dark'): Theme` returning
  `{ colors, spacing, radii, fonts, typography }`.
- Export `type Theme` and `type Scheme = 'light' | 'dark'`.
- Keep a default `export const theme = makeTheme('light')` so any not-yet-migrated
  import still compiles (transitional; all files get migrated in this work).

**`context/ThemeContext.tsx`** (new)
- `ThemeProvider` resolves the active scheme:
  `stored override ('system'|'light'|'dark') → if 'system' or unset, useColorScheme() → fallback 'light'`.
- Persists the override with `expo-secure-store` (already a dependency), key
  `nuru.theme.pref`. Value is the *preference* (`system`/`light`/`dark`), not the
  resolved scheme.
- Exposes `useTheme(): { theme: Theme; scheme: 'light'|'dark'; pref: Pref;
  setPref(p: Pref): void }`.
- Loads the stored pref on mount; until loaded, render with the system/light
  resolved scheme (no flash-of-wrong-theme beyond first frame; acceptable).

**Per styled file (~19 files)**
- Replace module-level `const styles = StyleSheet.create({...})` with a
  `function makeStyles(theme: Theme) { return StyleSheet.create({...}); }` and,
  inside the component, `const { theme } = useTheme(); const styles = useMemo(() => makeStyles(theme), [theme]);`.
- Replace direct `theme.colors.x` / `theme.typography.x` references in JSX with
  the `theme` from the hook.
- Files: `components/` — AddNoteSheet, AttachMenu, BottomDrawer, Brand, Button,
  ChatBubble, ChatInputBar, ChatOptionsModal, DrawerContent, EmptyState,
  Markdown, NoteCard, Screen, ThinkingIndicator, authStyles (helper — convert to
  `makeAuthStyles(theme)`); `app/` — `(auth)/login`, `(tabs)/index`,
  `(tabs)/notes`, `(tabs)/profile`, `(tabs)/_layout`, `note/[id]`, `_layout`.

## Wiring

- **`app.json`**: `userInterfaceStyle` `"dark"` → `"automatic"`. Splash
  `backgroundColor` and adaptive-icon `backgroundColor` are native/static and stay
  on a neutral value; leave splash as-is (dark splash is fine on first launch) or
  set to paper `#F7F6F3` — chosen: keep existing dark splash to avoid a white
  flash before JS loads. Revisit if it looks wrong.
- **`app/_layout.tsx`**: wrap the tree in `<ThemeProvider>`; set the status-bar
  style from the active scheme (`dark` content in light mode, `light` in dark).
- **`components/Screen.tsx`**: background from `theme.colors.bg` via the hook.
- **`app/(tabs)/profile.tsx`**: replace the placeholder `dark` Switch with a
  **System / Light / Dark segmented control** bound to `useTheme().setPref`.
  Remove the "Light mode lands with the backend" copy.

## Testing / verification

Manual verification via the `run` skill in the running app:
1. Fresh launch on a light-set OS → app is light, teal primary visible.
2. Settings → Dark → app flips live to charcoal + amber, no restart.
3. Settings → System → app follows OS; toggling OS scheme flips the app.
4. Kill + relaunch → last preference persisted (secure-store).
5. Spot-check chat screen, notes, note detail, login, drawer, attach menu in both
   modes for contrast/legibility — especially bubbles, buttons, borders.

No automated tests exist in the app today; this is UI/theming work verified by
observation. Add none unless a pure helper (`makeTheme`) warrants a small unit
test — optional.

## Out of scope

- Per-widget dark/light custom illustrations or logo variants (single teal logo
  works on both; provided asset is teal-on-transparent).
- Any backend/theme-sync across devices.
- Marketing/web apps — this is `apps/nuru` only.
