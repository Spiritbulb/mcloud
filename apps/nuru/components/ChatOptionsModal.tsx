// apps/nuru/components/ChatOptionsModal.tsx
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { BottomDrawer } from './BottomDrawer';
import { Theme } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import type { Provider } from '@/types';

type Props = {
  visible: boolean;
  onClose: () => void;
  provider: Provider;
  onSelectProvider: (p: Provider) => void;
  contextLabel: string | null;
  onClearContext: () => void;
};

const MODELS: { id: Provider; label: string; note: string }[] = [
  { id: 'azure', label: 'GPT-5', note: 'Best overall quality' },
  { id: 'anthropic', label: 'Haiku 4.5', note: 'Faster lightweight replies' },
];

export function ChatOptionsModal({
  visible,
  onClose,
  provider,
  onSelectProvider,
  contextLabel,
  onClearContext,
}: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <BottomDrawer
      visible={visible}
      onClose={onClose}
      title="Chat options"
      subtitle="Adjust model and note scope"
    >
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Model</Text>

        <View style={styles.stack}>
          {MODELS.map((m) => {
            const active = provider === m.id;

            return (
              <Pressable
                key={m.id}
                onPress={() => onSelectProvider(m.id)}
                accessibilityLabel={`Use ${m.label}`}
                accessibilityState={{ selected: active }}
                style={({ pressed }) => [
                  styles.optionRow,
                  active && styles.optionRowActive,
                  pressed && styles.optionRowPressed,
                ]}
              >
                <View style={styles.optionCopy}>
                  <Text style={[styles.optionTitle, active && styles.optionTitleActive]}>
                    {m.label}
                  </Text>
                  <Text style={styles.optionMeta}>{m.note}</Text>
                </View>

                <View style={[styles.radio, active && styles.radioActive]}>
                  {active ? <View style={styles.radioDot} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Context</Text>

        <View style={styles.contextCard}>
          <View style={styles.contextLeft}>
            <View style={styles.contextBadge}>
              <Ionicons name="albums-outline" size={16} color={theme.colors.primary} />
            </View>

            <View style={styles.optionCopy}>
              <Text style={styles.optionTitle}>
                {contextLabel ?? 'All notes'}
              </Text>
              <Text style={styles.optionMeta}>
                {contextLabel ? 'Current filtered scope' : 'No specific note pinned'}
              </Text>
            </View>
          </View>

          {contextLabel ? (
            <Pressable
              onPress={onClearContext}
              hitSlop={8}
              accessibilityLabel="Clear context"
              style={({ pressed }) => [styles.clearBtn, pressed && styles.clearBtnPressed]}
            >
              <Ionicons name="close" size={16} color={theme.colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Tools</Text>

        <View style={[styles.optionRow, styles.optionRowDisabled]}>
          <View style={styles.optionCopy}>
            <Text style={styles.optionTitleMuted}>Tools</Text>
            <Text style={styles.optionMeta}>Coming soon</Text>
          </View>

          <Ionicons name="construct-outline" size={18} color={theme.colors.textMuted} />
        </View>
      </View>
    </BottomDrawer>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
  section: {
    gap: theme.spacing.sm,
  },
  sectionLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  stack: {
    gap: theme.spacing.sm,
  },
  optionRow: {
    minHeight: 64,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceAlt,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  optionRowActive: {
    backgroundColor: theme.colors.primarySoft,
    borderColor: theme.colors.primary,
  },
  optionRowPressed: {
    opacity: 0.92,
  },
  optionRowDisabled: {
    opacity: 0.5,
  },
  optionCopy: {
    flex: 1,
    gap: 2,
  },
  optionTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  optionTitleActive: {
    color: theme.colors.text,
  },
  optionTitleMuted: {
    color: theme.colors.textMuted,
    fontSize: 15,
    fontWeight: '600',
  },
  optionMeta: {
    color: theme.colors.textMuted,
    fontSize: 13,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    borderColor: theme.colors.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.primary,
  },
  contextCard: {
    minHeight: 64,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceAlt,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  contextLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  contextBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtnPressed: {
    opacity: 0.85,
  },
  });
}