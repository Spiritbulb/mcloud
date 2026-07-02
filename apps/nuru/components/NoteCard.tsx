import { Pressable, View, Text, StyleSheet } from 'react-native';
import { Note } from '@/types';
import { theme } from '@/theme';

const sourceLabel: Record<Note['source'], string> = {
  text: 'Typed', file: 'File', photo: 'Photo', voice: 'Voice',
};

export function NoteCard({ note, onPress }: { note: Note; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { backgroundColor: theme.colors.surfaceAlt }]}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.title} numberOfLines={1}>{note.title}</Text>
        <Text style={styles.snippet} numberOfLines={1}>{note.content}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.subject}>{note.subject}</Text>
          <View style={styles.dot} />
          <Text style={styles.source}>{sourceLabel[note.source]}</Text>
        </View>
      </View>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface, padding: theme.spacing.md,
    borderRadius: theme.radii.md, borderWidth: 1, borderColor: theme.colors.border,
    marginBottom: theme.spacing.sm,
  },
  title: { ...theme.typography.heading, marginBottom: 2 },
  snippet: { ...theme.typography.muted, marginBottom: theme.spacing.sm },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  subject: { color: theme.colors.primary, fontSize: 12, fontWeight: '600' },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: theme.colors.textMuted },
  source: { color: theme.colors.textMuted, fontSize: 12 },
});
