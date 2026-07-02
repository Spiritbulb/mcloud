import { View, Text, StyleSheet } from 'react-native';
import { Logo } from '@/components/Logo';
import { theme } from '@/theme';

/**
 * The Nuru wordmark, set in Fraunces. Optionally stacked above the sunburst
 * for hero moments (login, empty states). Kept quiet everywhere else so the
 * serif stays a signature, not decoration.
 */
export function Brand({
  size = 'lg',
  withLogo = false,
  tagline,
}: {
  size?: 'lg' | 'sm';
  withLogo?: boolean;
  tagline?: string;
}) {
  const fontSize = size === 'lg' ? 44 : 28;
  return (
    <View style={styles.wrap}>
      {withLogo && <Logo size={size === 'lg' ? 72 : 40} />}
      <Text style={[theme.typography.brand, { fontSize }]}>Nuru</Text>
      {tagline && <Text style={[theme.typography.muted, styles.tagline]}>{tagline}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: theme.spacing.md },
  tagline: { letterSpacing: 0.3 },
});
