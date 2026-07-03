import { Message } from '@/types';
import { mapMessage } from './_map';
import type { AuthedFetch } from './notes';

export function createChatApi(authedFetch: AuthedFetch) {
  return {
    async history(): Promise<Message[]> {
      const res = await authedFetch('/api/mobile/chat');
      if (!res.ok) throw new Error('Could not load chat');
      const { messages } = (await res.json()) as { messages: Message[] };
      return messages.map(mapMessage);
    },

    async send(text: string, contextNoteIds: string[]): Promise<Message> {
      const res = await authedFetch('/api/mobile/chat', {
        method: 'POST',
        body: JSON.stringify({ text, contextNoteIds }),
      });
      if (!res.ok) throw new Error('Could not send message');
      const { message } = (await res.json()) as { message: Message };
      return mapMessage(message);
    },
  };
}
