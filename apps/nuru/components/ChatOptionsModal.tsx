// apps/nuru/components/ChatOptionsModal.tsx
// Chat options sheet opened by the composer's ( model · context ) pill. Sections:
// Model (GPT-5 / Haiku, single-select), Context (current scope, clearable), and a
// disabled "Tools — coming soon" row for future tool toggles. Mirrors AttachMenu's
// transparent Modal + tap-to-dismiss backdrop.
import { Modal, Pressable, View, Text, StyleSheet } from 'react-native';
import { theme } from '@/theme';
import type { Provider } from '@/types';

type Props = {
  visible: boolean;
  onClose: () => void;
  provider: Provider;
  onSelectProvider: (p: Provider) => void;
  contextLabel: string | null;
  onClearContext: () => void;
};

const MODELS: { id: Provider; label: string }[] = [
  { id: 'azure', label: 'GPT-5' },
  { id: 'anthropic', label: 'Haiku 4.5' },
];

export function ChatOptionsModal({
  visible, onClose, provider, onSelectProvider, contextLabel, onClearContext,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.section}>Model</Text>
          <View style={styles.rowGroup}>
            {MODELS.map((m) => {
              const active = provider === m.id;
              return (
                <Pressable
                  key={m.id}
                  style={[styles.choice, active && styles.choiceActive]}
                  onPress={() => { onSelectProvider(m.id); }}
                  accessibilityLabel={`Use ${m.label}`}
                >
                  <Text style={[styles.choiceText, active && styles.choiceTextActive]}>{m.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.section}>Context</Text>
          <View style={styles.contextRow}>
            <Text style={styles.contextText} numberOfLines={1}>
              {contextLabel ?? 'All notes'}
            </Text>
            {contextLabel && (
              <Pressable onPress={onClearContext} hitSlop={8} accessibilityLabel="Clear context">
                <Text style={styles.clear}>✕</Text>
              </Pressable>
            )}
          </View>

          <View style={styles.divider} />
          <View style={styles.toolsRow} accessibilityLabel="Tools coming soon">
            <Text style={styles.toolsText}>Tools — coming soon</Text>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginHorizontal: theme.spacing.lg,
    marginBottom: 96,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  section: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
  rowGroup: { flexDirection: 'row', gap: theme.spacing.sm },
  choice: {
    flex: 1, alignItems: 'center', paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.pill, backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  choiceActive: { backgroundColor: theme.colors.primarySoft, borderColor: theme.colors.primary },
  choiceText: { color: theme.colors.textMuted, fontSize: 14, fontWeight: '600' },
  choiceTextActive: { color: theme.colors.text },
  contextRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: theme.colors.surfaceAlt, borderRadius: theme.radii.pill,
    paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm,
  },
  contextText: { color: theme.colors.text, fontSize: 14, flex: 1 },
  clear: { color: theme.colors.textMuted, fontSize: 14, paddingHorizontal: theme.spacing.xs },
  divider: { height: 1, backgroundColor: theme.colors.border, marginTop: theme.spacing.xs },
  toolsRow: { opacity: 0.4, paddingVertical: theme.spacing.xs },
  toolsText: { color: theme.colors.textMuted, fontSize: 14 },
});
