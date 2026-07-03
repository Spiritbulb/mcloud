import { StyleSheet } from 'react-native';
import { theme } from '@/theme';

export const authStyles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', gap: theme.spacing.md },
  hero: { alignItems: 'center', marginBottom: theme.spacing.xl },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.text,
  },
  error: { color: theme.colors.danger, textAlign: 'center' },
  link: {
    color: theme.colors.accent,
    textAlign: 'center',
    marginTop: theme.spacing.md,
    fontSize: 15,
  },
  codeInput: {
    textAlign: 'center',
    letterSpacing: 8,
    fontSize: 24,
    fontWeight: '700',
  },
  changeLink: {
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
    fontSize: 14,
  },
});
