import { ReactNode, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Theme } from '@/theme';
import { useTheme } from '@/context/ThemeContext';

export function EmptyState({
  title,
  subtitle,
  hero,
}: {
  title: string;
  subtitle?: string;
  hero?: ReactNode;
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View style={styles.wrap}>
      {hero && <View style={styles.hero}>{hero}</View>}
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}
function makeStyles(theme: Theme) {
  return StyleSheet.create({
    wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm, padding: theme.spacing.lg },
    hero: { marginBottom: theme.spacing.md },
    title: { ...theme.typography.title, fontSize: 24, textAlign: 'center' },
    subtitle: { ...theme.typography.muted, textAlign: 'center', lineHeight: 20, maxWidth: 300 },
  });
}
