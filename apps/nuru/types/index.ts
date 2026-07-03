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
  status: 'pending' | 'approved' | 'rejected';
  fileUrl: string | null;
}

// Raw API row shape (snake_case) — mapped to Note in services/_map.ts.
export type NoteRow = {
  id: string;
  title: string | null;
  subject: string | null;
  source: NoteSource;
  original_content: string | null;
  file_url: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
};

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  contextNoteIds: string[];
  createdAt: string; // ISO
}
