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
