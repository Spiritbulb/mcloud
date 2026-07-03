// Pure mappers between raw API rows (snake_case) and app types (camelCase).
// The single boundary where API shape meets UI types — no I/O, unit-tested.
import { Note, NoteRow, Message } from '@/types';

export function mapNote(row: NoteRow): Note {
  return {
    id: row.id,
    title: row.title || 'Untitled note',
    subject: row.subject || 'General',
    content: row.original_content ?? '',
    source: row.source,
    createdAt: row.created_at,
    status: row.status,
    fileUrl: row.file_url,
  };
}

export function mapMessage(m: Message): Message {
  return {
    id: m.id,
    role: m.role,
    text: m.text,
    contextNoteIds: m.contextNoteIds ?? [],
    createdAt: m.createdAt,
  };
}
