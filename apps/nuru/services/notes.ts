import { Note, NoteRow, NoteSource } from '@/types';
import { mapNote } from './_map';
import { File as ExpoFile } from 'expo-file-system';

export type AuthedFetch = (path: string, init?: RequestInit) => Promise<Response>;

export type CreateNoteInput = {
  title: string;
  subject: string;
  source: NoteSource;
  content?: string;
  file?: { uri: string; name: string; type: string };
};

export function createNotesApi(authedFetch: AuthedFetch) {
  return {
    async list(): Promise<Note[]> {
      const res = await authedFetch('/api/mobile/notes');
      if (!res.ok) throw new Error('Could not load notes');
      const { notes } = (await res.json()) as { notes: NoteRow[] };
      return notes.map(mapNote);
    },

    async get(id: string): Promise<Note | null> {
      const res = await authedFetch(`/api/mobile/notes/${id}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error('Could not load note');
      const { note } = (await res.json()) as { note: NoteRow };
      return mapNote(note);
    },

    async create(input: CreateNoteInput): Promise<Note> {
      const form = new FormData();
      form.append('source', input.source);
      if (input.title) form.append('title', input.title);
      if (input.subject) form.append('subject', input.subject);

      if (input.source === 'text') {
        form.append('text', input.content ?? '');
      } else if (input.file) {
        // Expo fetch multipart requires an ExpoFile blob, NOT the RN {uri,name,type} part.
        const file = new ExpoFile(input.file.uri);
        form.append('file', file as unknown as Blob, input.file.name);
      }

      const res = await authedFetch('/api/mobile/notes', { method: 'POST', body: form });
      if (!res.ok) {
        const msg = await res.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error((msg as { error?: string }).error ?? 'Upload failed');
      }
      const { note } = (await res.json()) as { note: NoteRow };
      return mapNote(note);
    },
  };
}
