import { Message } from '@/types';
import { delay, id, rand } from './client';

let history: Message[] = [];

function mockReply(text: string, contextNoteIds: string[]): string {
  const ctx = contextNoteIds.length
    ? ` Using your ${contextNoteIds.length} referenced note(s), `
    : ' ';
  return `Here's a mock answer.${ctx}you asked: "${text}". ` +
    `(This is placeholder AI output — the real backend will answer from your notes.)`;
}

export const chat = {
  async history(): Promise<Message[]> {
    await delay(300);
    return [...history];
  },
  async send(text: string, contextNoteIds: string[]): Promise<Message> {
    const userMsg: Message = {
      id: id(), role: 'user', text, contextNoteIds,
      createdAt: new Date().toISOString(),
    };
    history.push(userMsg);
    await delay(rand(600, 1100));
    const reply: Message = {
      id: id(), role: 'assistant', text: mockReply(text, contextNoteIds),
      contextNoteIds, createdAt: new Date().toISOString(),
    };
    history.push(reply);
    return reply;
  },
};
