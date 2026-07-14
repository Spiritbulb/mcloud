import { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import { useApi } from '@/hooks/useApi';
import { Note } from '@/types';
import { Theme } from '@/theme';
import { useTheme } from '@/context/ThemeContext';

export default function NoteDetail() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { notes } = useApi();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const router = useRouter();
  const headerHeight = useHeaderHeight();

  useEffect(() => {
    if (!id) return;
    notes.get(id).then((n) => {
      setNote(n);
      setContent(n?.content ?? '');
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return <Screen edges={['bottom', 'left', 'right']}><ActivityIndicator color={theme.colors.primary} style={{ marginTop: 40 }} /></Screen>;
  }
  if (!note) {
    return <Screen edges={['bottom', 'left', 'right']}><Text style={theme.typography.body}>Note not found.</Text></Screen>;
  }

  return (
    <Screen keyboardAvoiding keyboardOffset={headerHeight} edges={['bottom', 'left', 'right']}>
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
function makeStyles(theme: Theme) {
  return StyleSheet.create({
    editor: { flex: 1, backgroundColor: theme.colors.surface, borderWidth: 1,
      borderColor: theme.colors.border, borderRadius: theme.radii.md, padding: theme.spacing.md,
      fontSize: 16, color: theme.colors.text, textAlignVertical: 'top' },
  });
}
