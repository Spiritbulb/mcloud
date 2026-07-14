import { View, KeyboardAvoidingView, StyleSheet } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { Theme } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import { PropsWithChildren, useMemo } from 'react';

// Screens rendered under a navigator header (the drawer tabs, the note Stack)
// must NOT re-apply the top inset — the header already pads below the notch, so
// a top edge here would double it and open a gap under the header. Headerless
// screens (login) keep the top edge so content clears the status bar.
const DEFAULT_EDGES: Edge[] = ['top', 'bottom', 'left', 'right'];

/**
 * Standard screen frame: safe-area inset + padded content on the app background.
 *
 * `edges` controls which sides get safe-area padding. Screens under a nav header
 * pass `['bottom','left','right']` to avoid doubling the top inset the header
 * already provides; headerless screens use the default (all edges).
 *
 * Screens that host a text input pass `keyboardAvoiding` so the focused field
 * (or a bottom-anchored composer) lifts above the on-screen keyboard instead of
 * being covered. `keyboardOffset` accounts for a nav header above the Screen —
 * pass `useHeaderHeight()` on headered screens, leave 0 where there's no header.
 * The behavior/offset idiom mirrors the one that already works in AddNoteSheet.
 */
export function Screen({
  children,
  keyboardAvoiding = false,
  keyboardOffset = 0,
  edges = DEFAULT_EDGES,
}: PropsWithChildren<{ keyboardAvoiding?: boolean; keyboardOffset?: number; edges?: Edge[] }>) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const inner = <View style={styles.inner}>{children}</View>;
  return (
    <SafeAreaView edges={edges} style={styles.safe}>
      {keyboardAvoiding ? (
        <KeyboardAvoidingView
          style={styles.fill}
          // "padding" on both platforms: it lifts bottom-anchored and
          // vertically-centered content (e.g. the centered login form) above the
          // keyboard. Android's older "height" behavior shrinks the container but
          // fails to reveal centered inputs, leaving them covered by the keyboard.
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
