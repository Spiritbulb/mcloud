import { Note, NoteSource } from '@/types';
import { delay, id, rand, maybeError } from './client';

let store: Note[] = [
  { id: 'n1', title: 'Photosynthesis', subject: 'Biology',
    content: 'Light reactions occur in the thylakoid membrane...',
    source: 'text', createdAt: '2026-06-28T10:00:00.000Z' },
  { id: 'n2', title: 'French Revolution timeline', subject: 'History',
    content: '1789 Estates-General; storming of the Bastille...',
    source: 'file', createdAt: '2026-06-29T14:30:00.000Z' },
  { id: 'n3', title: 'Derivatives cheat sheet', subject: 'Math',
    content: 'd/dx[x^n] = n·x^(n-1); product rule...',
    source: 'photo', createdAt: '2026-07-01T09:15:00.000Z' },
];

export const notes = {
  async list(): Promise<Note[]> {
    await delay(rand(400, 700));
    return [...store].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async get(noteId: string): Promise<Note | null> {
    await delay(rand(300, 600));
    return store.find((n) => n.id === noteId) ?? null;
  },
  async create(input: {
    title: string; subject: string; content: string; source: NoteSource;
  }): Promise<Note> {
    await delay(rand(500, 900));
    maybeError();
    const note: Note = {
      id: id(),
      title: input.title || 'Untitled note',
      subject: input.subject || 'General',
      content: input.content,
      source: input.source,
      createdAt: new Date().toISOString(),
    };
    store.unshift(note);
    return note;
  },
};
