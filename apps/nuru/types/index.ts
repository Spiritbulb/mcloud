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
// GET /notes/[id] additionally attaches a camelCase `signedUrl` (a time-limited
// download link for the private original); list rows omit it.
export type NoteRow = {
  id: string;
  title: string | null;
  subject: string | null;
  source: NoteSource;
  original_content: string | null;
  file_url: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  signedUrl?: string | null;
};

export type Provider = 'azure' | 'anthropic';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  contextNoteIds: string[];
  createdAt: string; // ISO
  // Present on assistant messages returned from a live send (A/B visibility).
  model?: string;
  provider?: Provider;
  usage?: { inputTokens: number; outputTokens: number };
}

export interface ChatSession {
  id: string;
  title: string;
  updatedAt: string; // ISO
}
