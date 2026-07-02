import { useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Note, NoteSource } from '@/types';
import { notes } from '@/services/notes';
import { Button } from '@/components/Button';
import { theme } from '@/theme';

type Props = { visible: boolean; onClose: () => void; onCreated: (note: Note) => void };

const placeholderContent: Record<Exclude<NoteSource, 'text'>, { title: string; content: string }> = {
  file:  { title: 'Uploaded document', content: '[Mock] Extracted text from your uploaded file will appear here once the backend is connected.' },
  photo: { title: 'Photo note',        content: '[Mock] Text recognized from your photo will appear here once OCR is connected.' },
  voice: { title: 'Voice note',        content: '[Mock] A transcript of your recording will appear here once transcription is connected.' },
};

export function AddNoteSheet({ visible, onClose, onCreated }: Props) {
  const [mode, setMode] = useState<NoteSource | null>(null);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setMode(null); setTitle(''); setSubject(''); setContent(''); setError(null); setBusy(false);
  }
  function close() { reset(); onClose(); }

  async function createText() {
    setBusy(true); setError(null);
    try {
      const note = await notes.create({ title, subject, content, source: 'text' });
      onCreated(note); reset();
    } catch (e) { setError((e as Error).message); setBusy(false); }
  }

  async function createStubbed(source: Exclude<NoteSource, 'text'>) {
    setBusy(true); setError(null);
    try {
      const p = placeholderContent[source];
      const note = await notes.create({ title: p.title, subject: 'General', content: p.content, source });
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
              <Pressable style={styles.option} onPress={() => createStubbed('file')}>
                <Text style={styles.optionText}>📄  Upload a file</Text>
              </Pressable>
              <Pressable style={styles.option} onPress={() => createStubbed('photo')}>
                <Text style={styles.optionText}>📷  Import from photo</Text>
              </Pressable>
              <Pressable style={styles.option} onPress={() => createStubbed('voice')}>
                <Text style={styles.optionText}>🎙️  Record voice</Text>
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
