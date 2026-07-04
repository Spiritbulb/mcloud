import { Message, ChatSession } from '@/types';
import { mapMessage } from './_map';
import type { AuthedFetch } from './notes';

export function createChatApi(authedFetch: AuthedFetch) {
  return {
    async listSessions(): Promise<ChatSession[]> {
      const res = await authedFetch('/api/mobile/chat/sessions');
      if (!res.ok) throw new Error('Could not load sessions');
      const { sessions } = (await res.json()) as { sessions: ChatSession[] };
      return sessions;
    },

    async createSession(): Promise<string> {
      const res = await authedFetch('/api/mobile/chat/sessions', { method: 'POST' });
      if (!res.ok) throw new Error('Could not start a new chat');
      const { id } = (await res.json()) as { id: string };
      return id;
    },

    async history(sessionId: string): Promise<Message[]> {
      const res = await authedFetch(`/api/mobile/chat?sessionId=${encodeURIComponent(sessionId)}`);
      if (!res.ok) throw new Error('Could not load chat');
      const { messages } = (await res.json()) as { messages: Message[] };
      return messages.map(mapMessage);
    },

    async send(text: string, contextNoteIds: string[], sessionId: string): Promise<Message> {
      const res = await authedFetch('/api/mobile/chat', {
        method: 'POST',
        body: JSON.stringify({ text, contextNoteIds, sessionId }),
      });
      if (!res.ok) throw new Error('Could not send message');
      const { message } = (await res.json()) as { message: Message };
      return mapMessage(message);
    },
  };
}
