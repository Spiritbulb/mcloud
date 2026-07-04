import { useEffect, useRef, useState } from 'react';
import { FlatList, View, Text, StyleSheet, Pressable } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { Screen } from '@/components/Screen';
import { ChatBubble } from '@/components/ChatBubble';
import { ChatInputBar } from '@/components/ChatInputBar';
import { EmptyState } from '@/components/EmptyState';
import { Logo } from '@/components/Logo';
import { ThinkingIndicator } from '@/components/ThinkingIndicator';
import { useApi } from '@/hooks/useApi';
import { Message } from '@/types';
import { theme } from '@/theme';

export default function Chat() {
  const { chat, notes: notesService } = useApi();
  const params = useLocalSearchParams<{ noteId?: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [contextNoteIds, setContextNoteIds] = useState<string[]>([]);
  const [contextLabel, setContextLabel] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);
  const headerHeight = useHeaderHeight();

  useEffect(() => { chat.history().then(setMessages); }, []);

  useEffect(() => {
    if (!params.noteId) return;
    setContextLabel(null);
    setContextNoteIds([params.noteId]);
    notesService.get(params.noteId).then((n) => setContextLabel(n ? n.title : null));
  }, [params.noteId]);

  function clearContext() {
    setContextNoteIds([]);
    setContextLabel(null);
  }

  async function onSend(text: string) {
    setSending(true);
    const optimistic: Message = {
      id: 'tmp', role: 'user', text, contextNoteIds, createdAt: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimistic]);
    try {
      await chat.send(text, contextNoteIds);
      setMessages(await chat.history());
    } finally {
      setSending(false);
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    }
  }

  return (
    <Screen keyboardAvoiding keyboardOffset={headerHeight}>
      {contextLabel && (
        <View style={styles.ctx}>
          <Text style={styles.ctxText} numberOfLines={1}>
            Scoped to <Text style={styles.ctxTitle}>{contextLabel}</Text>
          </Text>
          <Pressable onPress={clearContext} hitSlop={8} accessibilityLabel="Clear context">
            <Text style={styles.ctxClear}>✕</Text>
          </Pressable>
        </View>
      )}
      {messages.length === 0 ? (
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
      {sending && (
        <View style={styles.thinking}>
          <ThinkingIndicator size={28} />
        </View>
      )}
      <ChatInputBar onSend={onSend} disabled={sending} scopeLabel={contextLabel ?? undefined} />
    </Screen>
  );
}
const styles = StyleSheet.create({
  ctx: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: theme.colors.primarySoft, paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm, borderRadius: theme.radii.pill, marginBottom: theme.spacing.sm,
  },
  ctxText: { color: theme.colors.textMuted, fontSize: 13, flex: 1 },
  ctxTitle: { color: theme.colors.text, fontWeight: '600' },
  ctxClear: { fontSize: 14, color: theme.colors.textMuted, paddingHorizontal: theme.spacing.xs },
  thinking: { paddingVertical: theme.spacing.sm, paddingLeft: theme.spacing.xs },
});
