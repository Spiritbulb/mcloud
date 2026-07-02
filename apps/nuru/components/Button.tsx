import { Pressable, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { theme } from '@/theme';

type Props = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost';
  loading?: boolean;
};
export function Button({ title, onPress, variant = 'primary', loading }: Props) {
  const ghost = variant === 'ghost';
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [
        styles.base,
        ghost ? styles.ghost : styles.primary,
        pressed && !loading && { opacity: 0.85 },
        loading && { opacity: 0.6 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={ghost ? theme.colors.primary : theme.colors.onPrimary} />
      ) : (
        <Text style={[styles.text, ghost && styles.ghostText]}>{title}</Text>
      )}
    </Pressable>
  );
}
const styles = StyleSheet.create({
  base: { paddingVertical: theme.spacing.md, borderRadius: theme.radii.pill, alignItems: 'center' },
  primary: { backgroundColor: theme.colors.primary },
  ghost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.colors.border },
  text: { color: theme.colors.onPrimary, fontSize: 16, fontWeight: '600' },
  ghostText: { color: theme.colors.text },
});
