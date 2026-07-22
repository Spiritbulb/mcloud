// Material 3 UI primitives. All read the active scheme via useTheme() so they
// follow the system light/dark setting and match the web merchant UI tokens.
import * as React from 'react'
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewProps,
} from 'react-native'
import { useTheme, type Theme } from '../lib/theme'
import { config } from '../lib/config'
import { useAuth } from '../auth/AuthContext'

// ── Motion: staggered entrance (the one orchestrated page-load moment) ──────────

export function FadeInUp({
  children,
  delay = 0,
  distance = 14,
  style,
}: {
  children: React.ReactNode
  delay?: number
  distance?: number
  style?: ViewProps['style']
}) {
  const p = React.useRef(new Animated.Value(0)).current
  React.useEffect(() => {
    Animated.timing(p, {
      toValue: 1,
      duration: 420,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start()
  }, [p, delay])
  return (
    <Animated.View
      style={[
        { alignSelf: 'stretch' },
        style,
        {
          opacity: p,
          transform: [{ translateY: p.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  )
}

// ── Skeleton (shimmer loading placeholder) ──────────────────────────────────────

export function Skeleton({
  height = 16,
  width = '100%',
  radius = 8,
  style,
}: {
  height?: number
  width?: number | `${number}%`
  radius?: number
  style?: ViewProps['style']
}) {
  const t = useTheme()
  const shimmer = React.useRef(new Animated.Value(0)).current
  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [shimmer])
  return (
    <Animated.View
      style={[
        { height, width, borderRadius: radius, backgroundColor: t.colors.surfaceContainerHigh, opacity: shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) },
        style,
      ]}
    />
  )
}

/** A card-shaped skeleton row (avatar + two lines) for list loading states. */
export function SkeletonCard() {
  const t = useTheme()
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: t.colors.outlineVariant }}>
      <Skeleton height={44} width={'100%' as never} radius={12} style={{ width: 44 }} />
      <View style={{ flex: 1, gap: 8 }}>
        <Skeleton height={14} width={'60%'} />
        <Skeleton height={12} width={'40%'} />
      </View>
    </View>
  )
}

// ── Remote marketing image (served from apps/web/public) ────────────────────────

export function MarketingImage({
  name,
  width,
  height,
  opacity,
}: {
  name: string // e.g. 'marketing-make-it-yours.png'
  width: number
  height: number
  opacity?: number
}) {
  return (
    <Image
      source={{ uri: `${config.webBaseUrl}/${name}` }}
      style={{ width, height, opacity }}
      resizeMode="contain"
    />
  )
}

// ── Text ──────────────────────────────────────────────────────────────────────

export function Display({ children }: { children: React.ReactNode }) {
  const t = useTheme()
  return <Text style={[t.type.displaySmall, { color: t.colors.onSurface }]}>{children}</Text>
}
export function HeadlineLarge({ children }: { children: React.ReactNode }) {
  const t = useTheme()
  return <Text style={[t.type.headlineLarge, { color: t.colors.onSurface }]}>{children}</Text>
}
export function HeadlineSmall({ children }: { children: React.ReactNode }) {
  const t = useTheme()
  return <Text style={[t.type.headlineSmall, { color: t.colors.onSurface }]}>{children}</Text>
}
export function TitleLarge({ children, color }: { children: React.ReactNode; color?: string }) {
  const t = useTheme()
  return <Text style={[t.type.titleLarge, { color: color ?? t.colors.onSurface }]}>{children}</Text>
}
export function TitleMedium({ children, color }: { children: React.ReactNode; color?: string }) {
  const t = useTheme()
  return <Text style={[t.type.titleMedium, { color: color ?? t.colors.onSurface }]}>{children}</Text>
}
export function Body({ children, variant }: { children: React.ReactNode; variant?: boolean }) {
  const t = useTheme()
  return (
    <Text style={[t.type.bodyMedium, { color: variant ? t.colors.onSurfaceVariant : t.colors.onSurface }]}>
      {children}
    </Text>
  )
}
export function Overline({ children, color }: { children: React.ReactNode; color?: string }) {
  const t = useTheme()
  return <Text style={[t.type.overline, { color: color ?? t.colors.primary }]}>{children}</Text>
}

// ── Button (M3 variants) ───────────────────────────────────────────────────────

type ButtonVariant = 'filled' | 'tonal' | 'outlined' | 'text' | 'danger'

export function Button({
  label,
  onPress,
  variant = 'filled',
  loading,
  disabled,
  icon,
  accentColor,
}: {
  label: string
  onPress: () => void
  variant?: ButtonVariant
  loading?: boolean
  disabled?: boolean
  icon?: React.ReactNode
  accentColor?: { bg: string; fg: string }
}) {
  const t = useTheme()
  const resolved = buttonColors(t, variant)
  const { bg, fg, border } = accentColor ? { ...resolved, bg: accentColor.bg, fg: accentColor.fg } : resolved
  const isInactive = disabled || loading
  return (
    <Pressable
      onPress={onPress}
      disabled={isInactive}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, borderColor: border, borderWidth: border ? 1 : 0 },
        pressed && { opacity: 0.85 },
        isInactive && { opacity: 0.5 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} size="small" />
      ) : (
        <>
          {icon}
          <Text style={[t.type.labelLarge, { color: fg }]}>{label}</Text>
        </>
      )}
    </Pressable>
  )
}

function buttonColors(t: Theme, v: ButtonVariant): { bg: string; fg: string; border?: string } {
  switch (v) {
    case 'filled':
      return { bg: t.colors.primary, fg: t.colors.onPrimary }
    case 'tonal':
      return { bg: t.colors.secondaryContainer, fg: t.colors.onSecondaryContainer }
    case 'outlined':
      return { bg: 'transparent', fg: t.colors.primary, border: t.colors.outlineVariant }
    case 'text':
      return { bg: 'transparent', fg: t.colors.primary }
    case 'danger':
      return { bg: t.colors.errorContainer, fg: t.colors.onErrorContainer }
  }
}

// ── Card (M3 outlined surface) ─────────────────────────────────────────────────

export function Card({ children, style, tonal, ...rest }: ViewProps & { tonal?: boolean }) {
  const t = useTheme()
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: tonal ? t.colors.surfaceContainer : t.colors.surface,
          borderColor: t.colors.outlineVariant,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  )
}

// ── Text field (M3 outlined) ────────────────────────────────────────────────────

export function Field({
  label,
  helper,
  ...rest
}: { label: string; helper?: string } & TextInputProps) {
  const t = useTheme()
  const [focused, setFocused] = React.useState(false)
  return (
    <View style={{ gap: t.space(1.5) }}>
      <Text style={[t.type.labelMedium, { color: t.colors.onSurfaceVariant }]}>{label}</Text>
      <TextInput
        placeholderTextColor={t.colors.onSurfaceVariant}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          t.type.bodyLarge,
          styles.input,
          {
            color: t.colors.onSurface,
            backgroundColor: t.colors.surface,
            borderColor: focused ? t.colors.primary : t.colors.outlineVariant,
            borderWidth: focused ? 2 : 1,
          },
        ]}
        {...rest}
      />
      {helper ? (
        <Text style={[t.type.labelMedium, { color: t.colors.onSurfaceVariant }]}>{helper}</Text>
      ) : null}
    </View>
  )
}

// ── Avatar (logo, or initials on a deterministic tonal tile) ────────────────────

// Five M3-harmonious container tints; pick one deterministically from the name so
// each store/org gets a stable, distinct colour instead of all-blue sameness.
function avatarTints(t: Theme) {
  return t.dark
    ? [
        ['rgb(0 74 117)', 'rgb(205 229 255)'],
        ['rgb(79 64 97)', 'rgb(238 220 255)'],
        ['rgb(58 72 87)', 'rgb(213 228 246)'],
        ['rgb(56 70 60)', 'rgb(200 240 210)'],
        ['rgb(90 64 50)', 'rgb(255 220 200)'],
      ]
    : [
        ['rgb(205 229 255)', 'rgb(0 51 82)'],
        ['rgb(238 220 255)', 'rgb(56 42 73)'],
        ['rgb(213 228 246)', 'rgb(14 29 42)'],
        ['rgb(200 240 210)', 'rgb(16 56 30)'],
        ['rgb(255 224 204)', 'rgb(72 40 20)'],
      ]
}

function hashIndex(s: string, n: number) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h % n
}

export function Avatar({
  name,
  uri,
  size = 44,
  radius,
}: {
  name: string
  uri?: string | null
  size?: number
  radius?: number
}) {
  const t = useTheme()
  const r = radius ?? Math.round(size * 0.32)
  const initials = name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
  const tints = avatarTints(t)
  const [bg, fg] = tints[hashIndex(name, tints.length)]
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: r,
        overflow: 'hidden',
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size }} resizeMode="cover" />
      ) : (
        <Text style={[{ fontSize: size * 0.36, fontWeight: '700', color: fg }]}>{initials}</Text>
      )}
    </View>
  )
}

// ── Badge (self-sizing — fixes the stretched PRO chip) ──────────────────────────

export function Badge({
  label,
  tone = 'primary',
  accentColor,
}: {
  label: string
  tone?: 'primary' | 'tertiary' | 'neutral'
  accentColor?: { bg: string; fg: string }
}) {
  const t = useTheme()
  const map = {
    primary: [t.colors.primaryContainer, t.colors.onPrimaryContainer],
    tertiary: [t.colors.tertiaryContainer, t.colors.onSurface],
    neutral: [t.colors.surfaceContainerHigh, t.colors.onSurfaceVariant],
  } as const
  const [bg, fg] = accentColor ? [accentColor.bg, accentColor.fg] : map[tone]
  return (
    <View style={{ alignSelf: 'flex-start', backgroundColor: bg, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 9999 }}>
      <Text style={[t.type.labelMedium, { color: fg, letterSpacing: 0.8 }]}>{label}</Text>
    </View>
  )
}

// ── Role/count pill for section headers ─────────────────────────────────────────

export function MetaPill({ label }: { label: string }) {
  const t = useTheme()
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        flexDirection: 'row',
        backgroundColor: t.colors.surfaceContainerHigh,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 9999,
      }}
    >
      <Text style={[t.type.labelMedium, { color: t.colors.onSurfaceVariant }]}>{label}</Text>
    </View>
  )
}

// ── Safe destructive confirmation (type-to-confirm) ─────────────────────────────

export function ConfirmDelete({
  visible,
  title,
  message,
  confirmWord,
  confirmLabel = 'Delete',
  loading,
  onCancel,
  onConfirm,
}: {
  visible: boolean
  title: string
  message: string
  /** The exact text the user must type to enable the destructive action. */
  confirmWord: string
  confirmLabel?: string
  loading?: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const t = useTheme()
  const [typed, setTyped] = React.useState('')
  React.useEffect(() => {
    if (!visible) setTyped('')
  }, [visible])
  const matches = typed.trim() === confirmWord

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={confirmStyles.backdrop}>
        <View style={[confirmStyles.sheet, { backgroundColor: t.colors.surfaceContainerHigh }]}>
          <Text style={[t.type.titleLarge, { color: t.colors.error }]}>{title}</Text>
          <Text style={[t.type.bodyMedium, { color: t.colors.onSurfaceVariant }]}>{message}</Text>
          <Text style={[t.type.labelMedium, { color: t.colors.onSurfaceVariant }]}>
            Type <Text style={{ color: t.colors.onSurface, fontWeight: '700' }}>{confirmWord}</Text> to confirm.
          </Text>
          <TextInput
            value={typed}
            onChangeText={setTyped}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={confirmWord}
            placeholderTextColor={t.colors.onSurfaceVariant}
            style={[
              t.type.bodyLarge,
              confirmStyles.input,
              { color: t.colors.onSurface, borderColor: matches ? t.colors.error : t.colors.outlineVariant },
            ]}
          />
          <View style={confirmStyles.actions}>
            <View style={{ flex: 1 }}>
              <Button label="Cancel" variant="text" onPress={onCancel} />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                label={confirmLabel}
                variant="danger"
                onPress={onConfirm}
                loading={loading}
                disabled={!matches}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const confirmStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  sheet: { borderRadius: 28, padding: 24, gap: 14 },
  input: { minHeight: 52, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 4 },
})

// ── Screen header (back + title) for pushed sub-screens inside the tabs ─────────

export function ScreenHeader({ title, onBack }: { title: string; onBack: () => void }) {
  const t = useTheme()
  return (
    <View style={headerStyles.bar}>
      <Pressable onPress={onBack} hitSlop={12} style={({ pressed }) => pressed && { opacity: 0.6 }}>
        <Text style={{ fontSize: 26, color: t.colors.onSurface }}>‹</Text>
      </Pressable>
      <Text style={[t.type.titleLarge, { color: t.colors.onSurface, flex: 1 }]}>{title}</Text>
    </View>
  )
}

const headerStyles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, height: 52 },
})

// ── Screen container ─────────────────────────────────────────────────────────────

export function Screen({ children, style, ...rest }: ViewProps) {
  const t = useTheme()
  return (
    <View style={[{ flex: 1, backgroundColor: t.colors.background }, style]} {...rest}>
      {children}
    </View>
  )
}

// ── "Manage on web" row — the deep-link-out pattern ──────────────────────────────

export function ManageOnWeb({ label, path, icon }: { label: string; path: string; icon?: React.ReactNode }) {
  const t = useTheme()
  const { openOnWeb } = useAuth()
  return (
    <Pressable
      onPress={() => openOnWeb(path)}
      style={({ pressed }) => [
        styles.manageRow,
        { borderColor: t.colors.outlineVariant, backgroundColor: t.colors.surface },
        pressed && { backgroundColor: t.colors.surfaceContainerLow },
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space(3), flex: 1 }}>
        {icon}
        <Text style={[t.type.labelLarge, { color: t.colors.onSurface }]}>{label}</Text>
      </View>
      <Text style={[t.type.labelMedium, { color: t.colors.primary }]}>Manage on web ↗</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  btn: {
    height: 48,
    borderRadius: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 24,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  input: {
    minHeight: 52,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  manageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
})
