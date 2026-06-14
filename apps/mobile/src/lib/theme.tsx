// Material 3 theme — the EXACT token set from the web merchant UI
// (apps/web/app/globals.css `--md-sys-color-*`), so mobile matches web 1:1.
// Light + dark schemes; pick via useTheme() which follows the system setting,
// or a stored user override (light/dark/system) set via ThemeProvider.
import * as React from 'react'
import { useColorScheme } from 'react-native'
import * as SecureStore from 'expo-secure-store'

export type ThemePreference = 'light' | 'dark' | 'system'
const THEME_KEY = 'mcloud.theme'

export type M3Colors = {
  primary: string
  onPrimary: string
  primaryContainer: string
  onPrimaryContainer: string
  secondary: string
  onSecondary: string
  secondaryContainer: string
  onSecondaryContainer: string
  tertiary: string
  tertiaryContainer: string
  error: string
  onError: string
  errorContainer: string
  onErrorContainer: string
  background: string
  onBackground: string
  surface: string
  onSurface: string
  surfaceVariant: string
  onSurfaceVariant: string
  surfaceContainerLow: string
  surfaceContainer: string
  surfaceContainerHigh: string
  outline: string
  outlineVariant: string
  inverseSurface: string
  inverseOnSurface: string
}

const light: M3Colors = {
  primary: 'rgb(0 99 153)',
  onPrimary: 'rgb(255 255 255)',
  primaryContainer: 'rgb(205 229 255)',
  onPrimaryContainer: 'rgb(0 29 50)',
  secondary: 'rgb(81 96 111)',
  onSecondary: 'rgb(255 255 255)',
  secondaryContainer: 'rgb(213 228 246)',
  onSecondaryContainer: 'rgb(14 29 42)',
  tertiary: 'rgb(103 88 122)',
  tertiaryContainer: 'rgb(238 220 255)',
  error: 'rgb(186 26 26)',
  onError: 'rgb(255 255 255)',
  errorContainer: 'rgb(255 218 214)',
  onErrorContainer: 'rgb(147 0 10)',
  background: 'rgb(252 252 255)',
  onBackground: 'rgb(26 28 30)',
  surface: 'rgb(252 252 255)',
  onSurface: 'rgb(26 28 30)',
  surfaceVariant: 'rgb(222 227 235)',
  onSurfaceVariant: 'rgb(66 71 78)',
  surfaceContainerLow: 'rgb(243 243 246)',
  surfaceContainer: 'rgb(238 237 241)',
  surfaceContainerHigh: 'rgb(232 232 235)',
  outline: 'rgb(114 119 127)',
  outlineVariant: 'rgb(194 199 207)',
  inverseSurface: 'rgb(47 48 51)',
  inverseOnSurface: 'rgb(240 240 244)',
}

const dark: M3Colors = {
  primary: 'rgb(149 204 255)',
  onPrimary: 'rgb(0 51 82)',
  primaryContainer: 'rgb(0 74 117)',
  onPrimaryContainer: 'rgb(205 229 255)',
  secondary: 'rgb(185 200 218)',
  onSecondary: 'rgb(35 50 64)',
  secondaryContainer: 'rgb(58 72 87)',
  onSecondaryContainer: 'rgb(213 228 246)',
  tertiary: 'rgb(210 191 231)',
  tertiaryContainer: 'rgb(79 64 97)',
  error: 'rgb(255 180 171)',
  onError: 'rgb(105 0 5)',
  errorContainer: 'rgb(147 0 10)',
  onErrorContainer: 'rgb(255 218 214)',
  background: 'rgb(18 19 21)',
  onBackground: 'rgb(226 226 229)',
  surface: 'rgb(18 19 21)',
  onSurface: 'rgb(226 226 229)',
  surfaceVariant: 'rgb(66 71 78)',
  onSurfaceVariant: 'rgb(194 199 207)',
  surfaceContainerLow: 'rgb(26 28 30)',
  surfaceContainer: 'rgb(32 34 36)',
  surfaceContainerHigh: 'rgb(42 44 47)',
  outline: 'rgb(140 145 152)',
  outlineVariant: 'rgb(52 55 58)',
  inverseSurface: 'rgb(226 226 229)',
  inverseOnSurface: 'rgb(47 48 51)',
}

export const schemes = { light, dark }

// M3 shape + spacing scale (shared across light/dark).
export const shape = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 28, // M3 extra-large corner
  full: 9999,
}

export const space = (n: number) => n * 4

// M3 type scale (subset we use). Weights map to system fonts.
export const type = {
  displaySmall: { fontSize: 32, lineHeight: 40, fontWeight: '400' as const, letterSpacing: 0 },
  headlineLarge: { fontSize: 28, lineHeight: 36, fontWeight: '700' as const, letterSpacing: 0 },
  headlineSmall: { fontSize: 22, lineHeight: 28, fontWeight: '700' as const, letterSpacing: 0 },
  titleLarge: { fontSize: 20, lineHeight: 28, fontWeight: '600' as const, letterSpacing: 0 },
  titleMedium: { fontSize: 16, lineHeight: 24, fontWeight: '600' as const, letterSpacing: 0.15 },
  bodyLarge: { fontSize: 16, lineHeight: 24, fontWeight: '400' as const, letterSpacing: 0.5 },
  bodyMedium: { fontSize: 14, lineHeight: 20, fontWeight: '400' as const, letterSpacing: 0.25 },
  bodySmall:  { fontSize: 12, lineHeight: 16, fontWeight: '400' as const, letterSpacing: 0.4 },
  labelLarge: { fontSize: 14, lineHeight: 20, fontWeight: '600' as const, letterSpacing: 0.1 },
  labelMedium: { fontSize: 12, lineHeight: 16, fontWeight: '600' as const, letterSpacing: 0.5 },
  labelSmall:  { fontSize: 11, lineHeight: 16, fontWeight: '500' as const, letterSpacing: 0.5 },
  overline: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '700' as const,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
  },
}

export type Theme = {
  colors: M3Colors
  dark: boolean
  shape: typeof shape
  type: typeof type
  space: typeof space
}

// Pre-built, STABLE theme objects (one per scheme). Returning these by reference
// instead of a fresh object each render keeps `t` referentially stable, so
// downstream useMemo/StyleSheet caches actually hit and components don't re-render
// or rebuild styles every frame.
const lightTheme: Theme = { colors: light, dark: false, shape, type, space }
const darkTheme: Theme = { colors: dark, dark: true, shape, type, space }

type ThemeContextValue = {
  preference: ThemePreference
  setPreference: (p: ThemePreference) => Promise<void>
}

const ThemeContext = React.createContext<ThemeContextValue>({
  preference: 'system',
  setPreference: async () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = React.useState<ThemePreference>('system')

  React.useEffect(() => {
    SecureStore.getItemAsync(THEME_KEY).then((v) => {
      if (v === 'light' || v === 'dark' || v === 'system') setPreferenceState(v)
    })
  }, [])

  const setPreference = React.useCallback(async (p: ThemePreference) => {
    setPreferenceState(p)
    await SecureStore.setItemAsync(THEME_KEY, p)
  }, [])

  const value = React.useMemo(() => ({ preference, setPreference }), [preference, setPreference])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useThemePreference() {
  return React.useContext(ThemeContext)
}

/** Follows the stored preference, or the OS setting if preference is 'system'. */
export function useTheme(): Theme {
  const system = useColorScheme()
  const { preference } = React.useContext(ThemeContext)
  const isDark = preference === 'dark' || (preference === 'system' && system === 'dark')
  return isDark ? darkTheme : lightTheme
}
