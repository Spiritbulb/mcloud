// Small set of styled primitives matching the marketing palette/theme.
import * as React from 'react'
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewProps,
} from 'react-native'
import * as WebBrowser from 'expo-web-browser'
import { theme } from '../lib/theme'
import { config } from '../lib/config'

export function Screen({ children, style, ...rest }: ViewProps) {
  return (
    <View style={[styles.screen, style]} {...rest}>
      {children}
    </View>
  )
}

export function H1({ children }: { children: React.ReactNode }) {
  return <Text style={[styles.text, theme.font.h1]}>{children}</Text>
}
export function H2({ children }: { children: React.ReactNode }) {
  return <Text style={[styles.text, theme.font.h2]}>{children}</Text>
}
export function Overline({ children }: { children: React.ReactNode }) {
  return <Text style={[{ color: theme.color.muted }, theme.font.overline]}>{children}</Text>
}
export function Body({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <Text style={[theme.font.body, { color: muted ? theme.color.muted : theme.color.foreground }]}>
      {children}
    </Text>
  )
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading,
  disabled,
}: {
  label: string
  onPress: () => void
  variant?: 'primary' | 'outline' | 'danger'
  loading?: boolean
  disabled?: boolean
}) {
  const isPrimary = variant === 'primary'
  const isDanger = variant === 'danger'
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        isPrimary && { backgroundColor: theme.color.foreground },
        isDanger && { backgroundColor: theme.color.danger },
        variant === 'outline' && { borderWidth: 1, borderColor: theme.color.borderStrong },
        (pressed || disabled || loading) && { opacity: 0.7 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary || isDanger ? theme.color.onAccent : theme.color.foreground} />
      ) : (
        <Text
          style={[
            theme.font.label,
            { color: isPrimary || isDanger ? theme.color.onAccent : theme.color.foreground },
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  )
}

export function Field({ label, ...rest }: { label: string } & TextInputProps) {
  return (
    <View style={{ gap: theme.space(1.5) }}>
      <Text style={[theme.font.label, { color: theme.color.muted }]}>{label}</Text>
      <TextInput
        placeholderTextColor={theme.color.muted}
        style={styles.input}
        autoCapitalize="none"
        {...rest}
      />
    </View>
  )
}

export function Card({ children, style, ...rest }: ViewProps) {
  return (
    <View style={[styles.card, style]} {...rest}>
      {children}
    </View>
  )
}

/** Opens a path on apps/web in the in-app browser — the "complex stuff → web" pattern. */
export function ManageOnWeb({ label, path }: { label: string; path: string }) {
  return (
    <Pressable
      onPress={() => WebBrowser.openBrowserAsync(`${config.webBaseUrl}${path}`)}
      style={({ pressed }) => [styles.manageRow, pressed && { opacity: 0.6 }]}
    >
      <Text style={[theme.font.label, { color: theme.color.foreground }]}>{label}</Text>
      <Text style={{ color: theme.color.accent, fontWeight: '600' }}>Manage on web →</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.color.background, padding: theme.space(5) },
  text: { color: theme.color.foreground },
  btn: {
    height: 50,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.space(5),
  },
  input: {
    height: 48,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.color.border,
    paddingHorizontal: theme.space(3.5),
    color: theme.color.foreground,
    fontSize: 15,
  },
  card: {
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.color.border,
    backgroundColor: theme.color.surfaceSubtle,
    padding: theme.space(4),
  },
  manageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.space(4),
    paddingHorizontal: theme.space(4),
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.color.border,
  },
})
