import { View, Text, StyleSheet } from 'react-native';
import { useMemo } from 'react';
import { Message } from '@/types';
import { Theme } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import { Markdown } from '@/components/Markdown';
import { ThinkingIndicator } from '@/components/ThinkingIndicator';

/**
 * Reference-style chat rows. The user's message sits in a rounded grey bubble
 * pinned right; the assistant's reply is plain left-aligned text flush to the
 * margin — no bubble, no border — the way Claude/ChatGPT render replies. The
 * assistant reply is rendered as Markdown.
 *
 * While the assistant is composing, the same row shows the thinking indicator in
 * place (pass `thinking`); the first streamed token replaces it with text, so the
 * indicator and the reply live in one continuous row rather than jumping around.
 */
export function ChatBubble({
  message,
  thinking,
  status,
}: {
  message: Message;
  thinking?: boolean;
  status?: string;
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  if (message.role === 'user') {
    return (
      <View style={styles.userRow}>
        <View style={styles.userBubble}>
          <Text style={styles.userText}>{message.text}</Text>
        </View>
      </View>
    );
  }

  // Assistant: show the thinking indicator until the first token arrives, then
  // render the (streaming) reply as Markdown in the same row.
  const hasText = message.text.trim().length > 0;

  return (
    <View style={styles.aiRow}>
      {thinking && !hasText ? (
        <ThinkingIndicator size={26} status={status} />
      ) : (
        <Markdown text={message.text} />
      )}
      {message.role === 'assistant' && message.model && hasText && (
        <Text style={styles.meta}>
          {message.model}
          {message.usage ? ` · ${message.usage.inputTokens} in / ${message.usage.outputTokens} out` : ''}
        </Text>
      )}
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    userRow: { flexDirection: 'row', justifyContent: 'flex-end', marginVertical: theme.spacing.xs },
    userBubble: {
      maxWidth: '84%',
      backgroundColor: theme.colors.surfaceAlt,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 12,
      borderRadius: theme.radii.lg,
      borderBottomRightRadius: 4,
    },
    userText: { fontSize: 16, lineHeight: 23, color: theme.colors.text },

    aiRow: { marginVertical: theme.spacing.sm },
    meta: { color: theme.colors.textMuted, fontSize: 11, marginTop: 4 },
  });
}
