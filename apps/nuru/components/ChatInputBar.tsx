import { useMemo, useState } from 'react';
import {
  View,
  TextInput,
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '@/theme';
import { useTheme } from '@/context/ThemeContext';

export function ChatInputBar({
  onSend,
  disabled,
  modelLabel,
  contextLabel,
  onAttach,
  attaching,
  onOpenOptions,
}: {
  onSend: (t: string) => void;
  disabled?: boolean;
  modelLabel: string;
  contextLabel?: string;
  onAttach?: () => void;
  attaching?: boolean;
  onOpenOptions: () => void;
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  const [inputHeight, setInputHeight] = useState(22);

  const trimmed = text.trim();
  const canSend = trimmed.length > 0 && !disabled;
  const hasText = trimmed.length > 0;

  function submit() {
    if (!canSend) return;
    onSend(trimmed);
    setText('');
    setInputHeight(22);
  }

  return (
    <View style={[styles.bar, focused && styles.barFocused]}>
      <TextInput
        value={text}
        onChangeText={setText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onContentSizeChange={(e) => {
          const h = e.nativeEvent.contentSize.height;
          setInputHeight(Math.max(22, Math.min(110, h)));
        }}
        placeholder="Chat with Nuru..."
        placeholderTextColor={theme.colors.textMuted}
        style={[styles.input, { height: inputHeight }]}
        multiline
        textAlignVertical="top"
        editable={!disabled}
        selectionColor={theme.colors.primary}
        accessibilityLabel="Message input"
      />

      <View style={styles.controls}>
        <View style={styles.leftControls}>
          <Pressable
            onPress={onAttach}
            disabled={!onAttach || attaching}
            hitSlop={8}
            accessibilityLabel="Attach a file"
            accessibilityState={{ disabled: !onAttach || !!attaching, busy: !!attaching }}
            style={({ pressed }) => [
              styles.iconButton,
              pressed && !attaching && onAttach && styles.iconButtonPressed,
              (!onAttach || attaching) && styles.iconButtonDisabled,
            ]}
          >
            {attaching ? (
              <ActivityIndicator size="small" color={theme.colors.textMuted} />
            ) : (
              <Ionicons name="add" size={20} color={theme.colors.text} />
            )}
          </Pressable>

          <Pressable
            onPress={onOpenOptions}
            hitSlop={6}
            accessibilityLabel="Open chat options"
            style={({ pressed }) => [
              styles.optionsPill,
              pressed && styles.optionsPillPressed,
            ]}
          >
            <View style={styles.pillDot} />
            <Text style={styles.modelText} numberOfLines={1}>
              {modelLabel}
            </Text>
            <Text style={styles.contextText} numberOfLines={1}>
              {contextLabel ?? 'All notes'}
            </Text>
            <Ionicons
              name="chevron-down"
              size={14}
              color={theme.colors.textMuted}
            />
          </Pressable>
        </View>

        {!hasText ? (
          <View
            style={styles.iconButtonMuted}
            accessibilityLabel="Voice input coming soon"
            accessibilityState={{ disabled: true }}
          >
            <Ionicons
              name="mic-outline"
              size={18}
              color={theme.colors.textMuted}
            />
          </View>
        ) : (
          <Pressable
            onPress={submit}
            disabled={!canSend}
            hitSlop={8}
            accessibilityLabel="Send message"
            accessibilityState={{ disabled: !canSend }}
            style={({ pressed }) => [
              styles.sendButton,
              pressed && canSend && styles.sendButtonPressed,
              !canSend && styles.sendButtonDisabled,
            ]}
          >
            <Ionicons
              name="arrow-up"
              size={18}
              color={canSend ? theme.colors.onPrimary : theme.colors.textMuted}
            />
          </Pressable>
        )}
      </View>
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
  bar: {
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },

  // Focus ring: border-color only. Do NOT toggle Android `elevation` (or the
  // shadow that implies it) on focus — changing elevation reparents this View's
  // native layer, which detaches and blurs the focused TextInput, closing the
  // keyboard the instant it opens. iOS shadow is safe (no reparent), so it's
  // applied there only.
  barFocused: {
    borderColor: theme.colors.primary,
    ...(Platform.OS === 'ios'
      ? {
          shadowColor: theme.colors.primary,
          shadowOpacity: 0.08,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 2 },
        }
      : null),
  },

  input: {
    minHeight: 22,
    maxHeight: 110,
    fontSize: 17,
    lineHeight: 22,
    color: theme.colors.text,
    paddingHorizontal: theme.spacing.xs,
    paddingTop: theme.spacing.xs,
    paddingBottom: theme.spacing.sm,
  },

  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.xs,
  },

  leftControls: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },

  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },

  iconButtonDisabled: {
    opacity: 0.55,
  },

  iconButtonMuted: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.45,
  },

  optionsPill: {
    flex: 1,
    minHeight: 42,
    borderRadius: 21,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  optionsPillPressed: {
    opacity: 0.9,
  },

  pillDot: {
    width: 8,
    height: 8,
    borderRadius: 99,
    backgroundColor: theme.colors.primary,
  },

  modelText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '700',
    maxWidth: '38%',
  },

  contextText: {
    flex: 1,
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: '500',
  },

  sendButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sendButtonPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.92,
  },

  sendButtonDisabled: {
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  });
}