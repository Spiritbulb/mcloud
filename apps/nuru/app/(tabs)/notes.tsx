import { useCallback, useMemo, useState } from 'react';
import { FlatList, View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { NoteCard } from '@/components/NoteCard';
import { AddNoteSheet } from '@/components/AddNoteSheet';
import { EmptyState } from '@/components/EmptyState';
import { useApi } from '@/hooks/useApi';
import { Note } from '@/types';
import { Theme } from '@/theme';
import { useTheme } from '@/context/ThemeContext';

export default function Notes() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { notes: notesService } = useApi();
  const [items, setItems] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [sheet, setSheet] = useState(false);
  const router = useRouter();

  const load = useCallback(() => {
    setLoading(true);
    notesService.list().then((n) => { setItems(n); setLoading(false); });
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = items.filter((n) =>
    (n.title + n.subject + n.content).toLowerCase().includes(query.toLowerCase()));

  function onCreated(note: Note) {
    setSheet(false);
    setItems((prev) => [note, ...prev]);
    router.push({ pathname: '/note/[id]', params: { id: note.id } });
  }

  return (
    <Screen>
      <TextInput placeholder="Search notes…" value={query} onChangeText={setQuery}
        style={styles.search} placeholderTextColor={theme.colors.textMuted} />
      {loading ? (
        <ActivityIndicator color={theme.colors.primary} style={{ marginTop: theme.spacing.lg }} />
      ) : filtered.length === 0 ? (
        <EmptyState title="No notes yet" subtitle="Tap + to add your first note." />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(n) => n.id}
          renderItem={({ item }) => (
            <NoteCard note={item} onPress={() => router.push({ pathname: '/note/[id]', params: { id: item.id } })} />
          )}
        />
      )}
      <Pressable style={styles.fab} onPress={() => setSheet(true)}>
        <Text style={styles.fabText}>＋</Text>
      </Pressable>
      <AddNoteSheet visible={sheet} onClose={() => setSheet(false)} onCreated={onCreated} />
    </Screen>
  );
}
function makeStyles(theme: Theme) {
  return StyleSheet.create({
    search: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border,
      borderRadius: theme.radii.pill, paddingHorizontal: theme.spacing.md, paddingVertical: 12,
      fontSize: 15, color: theme.colors.text, marginBottom: theme.spacing.md },
    fab: { position: 'absolute', right: theme.spacing.lg, bottom: theme.spacing.lg,
      width: 56, height: 56, borderRadius: 28, backgroundColor: theme.colors.primary,
      alignItems: 'center', justifyContent: 'center', elevation: 4,
      shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
    fabText: { color: theme.colors.onPrimary, fontSize: 28, lineHeight: 30 },
  });
}
