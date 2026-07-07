import { useState } from 'react';
import { View, TextInput, Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { theme } from '@/theme';

/**
 * The chat composer — a single raised card in the reference's shape. Text field
 * on top; a control row below carries the attach (+) affordance on the left, the
 * ( model · context ) pill that opens ChatOptionsModal, a disabled mic affordance,
 * and the round send control on the right.
 *
 * The (+) attach button calls `onAttach` when provided; while `attaching` it is
 * disabled and shows a spinner in place of the glyph.
 */
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
  const [text, setText] = useState('');
  const canSend = text.trim().length > 0 && !disabled;

  function submit() {
    const t = text.trim();
    if (!t) return;
    onSend(t);
    setText('');
  }

  return (
    <View style={styles.bar}>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Ask about your notes…"
        placeholderTextColor={theme.colors.textMuted}
        style={styles.input}
        multiline
      />
      <View style={styles.controls}>
        <Pressable
          style={styles.attach}
          onPress={onAttach}
          disabled={!onAttach || attaching}
          accessibilityLabel="Attach a file"
        >
          {attaching ? (
            <ActivityIndicator size="small" color={theme.colors.textMuted} />
          ) : (
            <Text style={styles.attachGlyph}>＋</Text>
          )}
        </Pressable>
        <Pressable
          style={styles.pill}
          onPress={onOpenOptions}
          accessibilityLabel="Chat options"
        >
          <View style={styles.pillDot} />
          <Text style={styles.pillText} numberOfLines={1}>
            {modelLabel} · {contextLabel ?? 'All notes'} ▾
          </Text>
        </Pressable>
        <View style={styles.mic} accessibilityLabel="Voice input coming soon">
          <Text style={styles.micGlyph}>🎙</Text>
        </View>
        <Pressable
          onPress={submit}
          disabled={!canSend}
          style={[styles.send, !canSend && styles.sendDisabled]}
          accessibilityLabel="Send message"
        >
          <Text style={styles.sendGlyph}>↑</Text>
        </Pressable>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  bar: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  input: {
    maxHeight: 120,
    fontSize: 16,
    color: theme.colors.text,
    paddingVertical: theme.spacing.xs,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  attach: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachGlyph: { color: theme.colors.textMuted, fontSize: 20, lineHeight: 22 },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radii.pill,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  pillDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: theme.colors.primary },
  pillText: { color: theme.colors.textMuted, fontSize: 13, fontWeight: '500' },
  mic: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
    opacity: 0.4,
  },
  micGlyph: { fontSize: 16 },
  send: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { backgroundColor: theme.colors.surfaceAlt },
  sendGlyph: { color: theme.colors.onPrimary, fontSize: 20, fontWeight: '700', lineHeight: 22 },
});
