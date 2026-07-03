import { useEffect, useState } from 'react';
import { View, Text, TextInput, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import { useApi } from '@/hooks/useApi';
import { Note } from '@/types';
import { theme } from '@/theme';

export default function NoteDetail() {
  const { notes } = useApi();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (!id) return;
    notes.get(id).then((n) => {
      setNote(n);
      setContent(n?.content ?? '');
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return <Screen><ActivityIndicator color={theme.colors.primary} style={{ marginTop: 40 }} /></Screen>;
  }
  if (!note) {
    return <Screen><Text style={theme.typography.body}>Note not found.</Text></Screen>;
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: note.title }} />
      <Text style={theme.typography.title}>{note.title}</Text>
      <Text style={[theme.typography.muted, { marginBottom: theme.spacing.md }]}>{note.subject}</Text>
      <TextInput
        value={content}
        onChangeText={setContent}
        multiline
        style={styles.editor}
        placeholderTextColor={theme.colors.textMuted}
      />
      <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing.md }}>
        <Button
          title="💬  Chat about this note"
          onPress={() => router.push({ pathname: '/(tabs)', params: { noteId: note.id } })}
        />
      </View>
    </Screen>
  );
}
const styles = StyleSheet.create({
  editor: { flex: 1, backgroundColor: theme.colors.surface, borderWidth: 1,
    borderColor: theme.colors.border, borderRadius: theme.radii.md, padding: theme.spacing.md,
    fontSize: 16, color: theme.colors.text, textAlignVertical: 'top' },
});
