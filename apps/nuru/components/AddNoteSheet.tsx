import { useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Note, NoteSource } from '@/types';
import { useApi } from '@/hooks/useApi';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Button } from '@/components/Button';
import { theme } from '@/theme';

type Props = { visible: boolean; onClose: () => void; onCreated: (note: Note) => void };

export function AddNoteSheet({ visible, onClose, onCreated }: Props) {
  const [mode, setMode] = useState<NoteSource | null>(null);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { notes } = useApi();

  function reset() {
    setMode(null); setTitle(''); setSubject(''); setContent(''); setError(null); setBusy(false);
  }
  function close() { reset(); onClose(); }

  async function createText() {
    setBusy(true); setError(null);
    try {
      const note = await notes.create({ title, subject, source: 'text', content });
      onCreated(note); reset();
    } catch (e) { setError((e as Error).message); setBusy(false); }
  }

  async function pickFile() {
    setError(null);
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    await upload('file', {
      uri: asset.uri,
      name: asset.name ?? 'document',
      type: asset.mimeType ?? 'application/octet-stream',
    });
  }

  async function pickPhoto() {
    setError(null);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { setError('Photo access is needed to import an image.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const name = asset.fileName ?? `photo-${Date.now()}.jpg`;
    await upload('photo', { uri: asset.uri, name, type: asset.mimeType ?? 'image/jpeg' });
  }

  async function upload(source: 'file' | 'photo', file: { uri: string; name: string; type: string }) {
    setBusy(true); setError(null);
    try {
      const note = await notes.create({ title, subject, source, file });
      onCreated(note); reset();
    } catch (e) { setError((e as Error).message); setBusy(false); }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <Text style={styles.sheetTitle}>Add a note</Text>

          {mode === null && (
            <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing.md }}>
              <Pressable style={styles.option} onPress={() => setMode('text')}>
                <Text style={styles.optionText}>✏️  Type or paste text</Text>
              </Pressable>
              <Pressable style={styles.option} onPress={pickFile}>
                <Text style={styles.optionText}>📄  Upload a file</Text>
              </Pressable>
              <Pressable style={styles.option} onPress={pickPhoto}>
                <Text style={styles.optionText}>📷  Import from photo</Text>
              </Pressable>
              <Pressable style={[styles.option, { opacity: 0.4 }]} disabled>
                <Text style={styles.optionText}>🎙️  Record voice — coming soon</Text>
              </Pressable>
            </View>
          )}

          {mode === 'text' && (
            <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing.md }}>
              <TextInput placeholder="Title" value={title} onChangeText={setTitle}
                style={styles.input} placeholderTextColor={theme.colors.textMuted} />
              <TextInput placeholder="Subject" value={subject} onChangeText={setSubject}
                style={styles.input} placeholderTextColor={theme.colors.textMuted} />
              <TextInput placeholder="Paste or type your notes…" value={content} onChangeText={setContent}
                style={[styles.input, { height: 120 }]} multiline
                placeholderTextColor={theme.colors.textMuted} />
              <Button title="Save note" onPress={createText} loading={busy} />
            </View>
          )}

          {busy && mode !== 'text' && <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 12 }} />}
          {error && <Text style={{ color: theme.colors.danger, marginTop: 8 }}>{error}</Text>}

          <Pressable onPress={close} style={{ marginTop: theme.spacing.md }}>
            <Text style={{ color: theme.colors.accent, textAlign: 'center' }}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: theme.colors.surface, borderTopLeftRadius: theme.radii.lg,
    borderTopRightRadius: theme.radii.lg, padding: theme.spacing.lg,
    borderTopWidth: 1, borderColor: theme.colors.border },
  grabber: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2,
    backgroundColor: theme.colors.border, marginBottom: theme.spacing.md },
  sheetTitle: { ...theme.typography.title, fontSize: 22 },
  option: { backgroundColor: theme.colors.surfaceAlt, padding: theme.spacing.md, borderRadius: theme.radii.md },
  optionText: { fontSize: 16, color: theme.colors.text },
  input: { backgroundColor: theme.colors.bg, borderWidth: 1, borderColor: theme.colors.border,
    borderRadius: theme.radii.md, padding: 12, fontSize: 15, color: theme.colors.text },
});
