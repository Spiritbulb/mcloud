import { View, Text, StyleSheet } from 'react-native';
import { useMemo } from 'react';
import { Logo } from '@/components/Logo';
import { Theme } from '@/theme';
import { useTheme } from '@/context/ThemeContext';

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
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const fontSize = size === 'lg' ? 44 : 28;
  return (
    <View style={styles.wrap}>
      {withLogo && <Logo size={size === 'lg' ? 72 : 40} />}
      <Text style={[theme.typography.brand, { fontSize }]}>Nuru</Text>
      {tagline && <Text style={[theme.typography.muted, styles.tagline]}>{tagline}</Text>}
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    wrap: { alignItems: 'center', gap: theme.spacing.md },
    tagline: { letterSpacing: 0.3 },
  });
}
