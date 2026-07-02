import { View, Text, StyleSheet } from 'react-native';
import { Message } from '@/types';
import { theme } from '@/theme';

export function ChatBubble({ message }: { message: Message }) {
  const mine = message.role === 'user';
  return (
    <View style={[styles.row, { justifyContent: mine ? 'flex-end' : 'flex-start' }]}>
      <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
        <Text style={[styles.text, { color: mine ? theme.colors.onPrimary : theme.colors.text }]}>
          {message.text}
        </Text>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', marginVertical: theme.spacing.xs },
  bubble: { maxWidth: '84%', paddingHorizontal: theme.spacing.md, paddingVertical: 12, borderRadius: theme.radii.lg },
  text: { fontSize: 15, lineHeight: 21 },
  mine: { backgroundColor: theme.colors.bubbleUser, borderBottomRightRadius: 4 },
  theirs: {
    backgroundColor: theme.colors.bubbleAi,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
});
