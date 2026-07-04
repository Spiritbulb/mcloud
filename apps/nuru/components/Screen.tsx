import { SafeAreaView, View, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { theme } from '@/theme';
import { PropsWithChildren } from 'react';

/**
 * Standard screen frame: safe-area inset + padded content on the app background.
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
}: PropsWithChildren<{ keyboardAvoiding?: boolean; keyboardOffset?: number }>) {
  const inner = <View style={styles.inner}>{children}</View>;
  return (
    <SafeAreaView style={styles.safe}>
      {keyboardAvoiding ? (
        <KeyboardAvoidingView
          style={styles.fill}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  fill: { flex: 1 },
  inner: { flex: 1, padding: theme.spacing.md },
});
