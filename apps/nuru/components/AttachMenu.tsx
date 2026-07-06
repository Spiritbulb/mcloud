// apps/nuru/components/AttachMenu.tsx
// Small anchored dropdown for the chat composer's "+". Files is active; Camera is
// greyed ("coming soon"), mirroring the existing disabled-row pattern. A
// transparent full-screen backdrop dismisses on outside tap (not a full Modal).
import { Modal, Pressable, View, Text, StyleSheet } from 'react-native';
import { theme } from '@/theme';

type Props = { visible: boolean; onClose: () => void; onPickFiles: () => void };

export function AttachMenu({ visible, onClose, onPickFiles }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.card}>
          <Pressable
            style={styles.row}
            onPress={() => { onClose(); onPickFiles(); }}
            accessibilityLabel="Attach a file"
          >
            <Text style={styles.rowText}>📄  Files</Text>
          </Pressable>
          <View style={styles.divider} />
          <View style={[styles.row, styles.rowDisabled]} accessibilityLabel="Camera coming soon">
            <Text style={[styles.rowText, styles.rowTextDisabled]}>📷  Camera — coming soon</Text>
          </View>
        </View>
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
    marginBottom: 96, // sit above the composer
    overflow: 'hidden',
  },
  row: { padding: theme.spacing.md },
  rowDisabled: { opacity: 0.4 },
  rowText: { fontSize: 16, color: theme.colors.text },
  rowTextDisabled: { color: theme.colors.textMuted },
  divider: { height: 1, backgroundColor: theme.colors.border },
});
