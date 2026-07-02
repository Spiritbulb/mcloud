export interface User {
  id: string;
  name: string;
  email: string;
}

export type NoteSource = 'text' | 'file' | 'photo' | 'voice';

export interface Note {
  id: string;
  title: string;
  subject: string;
  content: string;
  source: NoteSource;
  createdAt: string; // ISO
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  contextNoteIds: string[];
  createdAt: string; // ISO
}
