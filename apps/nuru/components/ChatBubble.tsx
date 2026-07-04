import { View, Text, StyleSheet } from 'react-native';
import { Message } from '@/types';
import { theme } from '@/theme';

/**
 * Reference-style chat rows. The user's message sits in a rounded grey bubble
 * pinned right; the assistant's reply is plain left-aligned text flush to the
 * margin — no bubble, no border — the way Claude/ChatGPT render replies.
 */
export function ChatBubble({ message }: { message: Message }) {
  if (message.role === 'user') {
    return (
      <View style={styles.userRow}>
        <View style={styles.userBubble}>
          <Text style={styles.userText}>{message.text}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.aiRow}>
      <Text style={styles.aiText}>{message.text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  userRow: { flexDirection: 'row', justifyContent: 'flex-end', marginVertical: theme.spacing.xs },
  userBubble: {
    maxWidth: '84%',
    backgroundColor: theme.colors.surfaceAlt,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
    borderRadius: theme.radii.lg,
    borderBottomRightRadius: 4,
  },
  userText: { fontSize: 15, lineHeight: 21, color: theme.colors.text },

  aiRow: { marginVertical: theme.spacing.sm },
  aiText: { fontSize: 15, lineHeight: 22, color: theme.colors.text },
});
