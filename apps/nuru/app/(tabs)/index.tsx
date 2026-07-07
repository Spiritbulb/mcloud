import { useEffect, useRef, useState } from 'react';
import { FlatList, View, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import * as DocumentPicker from 'expo-document-picker';
import { Screen } from '@/components/Screen';
import { ChatBubble } from '@/components/ChatBubble';
import { ChatInputBar } from '@/components/ChatInputBar';
import { EmptyState } from '@/components/EmptyState';
import { Logo } from '@/components/Logo';
import { ThinkingIndicator } from '@/components/ThinkingIndicator';
import { AttachMenu } from '@/components/AttachMenu';
import { ChatOptionsModal } from '@/components/ChatOptionsModal';
import { useApi } from '@/hooks/useApi';
import { cleanParam } from '@/services/_params';
import { toUploadable } from '@/services/upload';
import { Message } from '@/types';
import type { Provider } from '@/types';
import { theme } from '@/theme';

export default function Chat() {
  const { chat, notes: notesService } = useApi();
  const params = useLocalSearchParams<{ noteId?: string; sessionId?: string }>();
  // expo-router can hand back the literal string "undefined" for an absent param;
  // cleanParam collapses it (and null/empty) so we only treat a real id as present.
  const routedSessionId = cleanParam(params.sessionId);
  const routedNoteId = cleanParam(params.noteId);
  const [sessionId, setSessionId] = useState<string | null>(routedSessionId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [contextNoteIds, setContextNoteIds] = useState<string[]>([]);
  const [contextLabel, setContextLabel] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<string | undefined>();
  const listRef = useRef<FlatList<Message>>(null);
  const headerHeight = useHeaderHeight();

  const [loadError, setLoadError] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [attaching, setAttaching] = useState(false);
  const [provider, setProvider] = useState<Provider>('azure');
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const modelLabel = provider === 'anthropic' ? 'Haiku 4.5' : 'GPT-5';

  // Resolve a session: use the routed one, else start a fresh session. Any failure
  // must surface (not leave the screen stuck on a loading flash), so it's caught.
  useEffect(() => {
    let cancelled = false;
    async function resolve() {
      setLoadError(false);
      try {
        const sid = routedSessionId ?? (await chat.createSession());
        if (cancelled) return;
        const initial = await chat.history(sid);
        if (cancelled) return;
        setSessionId(sid);
        setMessages(initial);
      } catch {
        if (!cancelled) setLoadError(true);
      }
    }
    resolve();
    return () => { cancelled = true; };
  }, [routedSessionId]);

  useEffect(() => {
    if (!routedNoteId) return;
    setContextLabel(null);
    setContextNoteIds([routedNoteId]);
    notesService.get(routedNoteId).then((n) => setContextLabel(n ? n.title : null));
  }, [routedNoteId]);

  function clearContext() {
    setContextNoteIds([]);
    setContextLabel(null);
  }

  async function onSend(text: string) {
    if (!sessionId) return;
    setSending(true);
    setStatus('thinking');
    setStreamingText(null);
    const optimistic: Message = {
      id: 'tmp', role: 'user', text, contextNoteIds, createdAt: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimistic]);
    try {
      await chat.send(text, contextNoteIds, sessionId, provider, {
        onStatus: setStatus,
        onToken: (t) => setStreamingText((prev) => (prev ?? '') + t),
      });
      setMessages(await chat.history(sessionId));
    } catch {
      // Roll back the optimistic bubble so a failed send doesn't leave a ghost
      // message with no reply.
      setMessages((m) => m.filter((msg) => msg.id !== 'tmp'));
      setLoadError(true);
    } finally {
      setSending(false);
      setStatus(undefined);
      setStreamingText(null);
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    }
  }

  async function onPickFiles() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const a = result.assets[0];
    setAttaching(true);
    setLoadError(false);
    try {
      const file = await toUploadable({ uri: a.uri, name: a.name, mimeType: a.mimeType });
      const note = await notesService.create({ title: a.name ?? 'Attachment', subject: '', source: 'file', file });
      // Scope the chat to the new note so the next question is asked against it.
      setContextNoteIds([note.id]);
      setContextLabel(note.title);
    } catch (e) {
      setContextLabel((e as Error).message);
    } finally {
      setAttaching(false);
    }
  }

  return (
    <Screen keyboardAvoiding keyboardOffset={headerHeight}>
      {loadError && messages.length === 0 ? (
        <EmptyState
          hero={<Logo size={80} />}
          title="Couldn’t load this chat"
          subtitle="Something went wrong. Pull to retry, or start a new chat from the menu."
        />
      ) : messages.length === 0 ? (
        <EmptyState
          hero={<Logo size={80} />}
          title="Chat with Nuru"
          subtitle="Ask anything about your notes — or open a note and tap “Chat about this note.”"
        />
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => <ChatBubble message={item} />}
          contentContainerStyle={{ paddingVertical: theme.spacing.sm }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        />
      )}
      {streamingText != null && (
        <View style={{ paddingHorizontal: theme.spacing.md }}>
          <ChatBubble
            message={{
              id: 'streaming', role: 'assistant', text: streamingText,
              contextNoteIds: [], createdAt: new Date().toISOString(),
            }}
          />
        </View>
      )}
      {sending && (
        <View style={styles.thinking}>
          <ThinkingIndicator size={28} status={status} />
        </View>
      )}
      <ChatInputBar
        onSend={onSend}
        disabled={sending}
        modelLabel={modelLabel}
        contextLabel={contextLabel ?? undefined}
        onAttach={() => setAttachOpen(true)}
        attaching={attaching}
        onOpenOptions={() => setOptionsOpen(true)}
      />
      <AttachMenu
        visible={attachOpen}
        onClose={() => setAttachOpen(false)}
        onPickFiles={onPickFiles}
      />
      <ChatOptionsModal
        visible={optionsOpen}
        onClose={() => setOptionsOpen(false)}
        provider={provider}
        onSelectProvider={setProvider}
        contextLabel={contextLabel}
        onClearContext={clearContext}
      />
    </Screen>
  );
}
const styles = StyleSheet.create({
  thinking: { paddingVertical: theme.spacing.sm, paddingLeft: theme.spacing.xs },
});
