import { Message, ChatSession } from '@/types';
import { mapMessage } from './_map';
import type { AuthedFetch } from './notes';

export function createChatApi(authedFetch: AuthedFetch, streamingFetch: AuthedFetch) {
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

    async send(
      text: string,
      contextNoteIds: string[],
      sessionId: string,
      provider: 'azure' | 'anthropic',
      opts?: { onStatus?: (status: string) => void; onToken?: (text: string) => void },
    ): Promise<Message> {
      const res = await streamingFetch('/api/mobile/chat', {
        method: 'POST',
        body: JSON.stringify({ text, contextNoteIds, sessionId, provider }),
      });
      if (!res.ok || !res.body) throw new Error('Could not send message');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let message: Message | null = null;

      // Parse newline-delimited JSON frames as they arrive.
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (value) buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (!line) continue;
          const evt = JSON.parse(line) as
            | { type: 'status'; value: string }
            | { type: 'token'; value: string }
            | { type: 'done'; message: Message; meta?: { model: string; provider: 'azure' | 'anthropic'; usage: { inputTokens: number; outputTokens: number } } }
            | { type: 'error'; error: string };
          if (evt.type === 'status') opts?.onStatus?.(evt.value);
          else if (evt.type === 'token') opts?.onToken?.(evt.value);
          else if (evt.type === 'done') {
            message = mapMessage({
              ...evt.message,
              model: evt.meta?.model,
              provider: evt.meta?.provider,
              usage: evt.meta?.usage,
            });
          } else if (evt.type === 'error') throw new Error(evt.error);
        }
        if (done) break;
      }
      if (!message) throw new Error('Could not send message');
      return message;
    },
  };
}
