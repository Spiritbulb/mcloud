// Mobile design tokens — a native translation of the marketing site's palette
// (apps/web/components/home-client.tsx): refined neutrals, subtle borders, bold
// tracking-tight headings, rounded cards. Brand: charcoal #1c2228 + gold #c9a96e.

export const theme = {
  color: {
    background: '#ffffff',
    foreground: '#1c2228',
    muted: '#6b7280', // muted-foreground
    mutedSurface: '#f5f0eb', // warm light surface from brand palette
    border: 'rgba(28,34,40,0.12)',
    borderStrong: 'rgba(28,34,40,0.24)',
    surfaceSubtle: 'rgba(28,34,40,0.03)',
    accent: '#c9a96e', // brand gold
    accentBlue: '#7aa2e0',
    accentPurple: '#a98cdc',
    danger: '#dc2626',
    onAccent: '#ffffff',
    onDark: '#f5f0eb',
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    pill: 9999,
  },
  space: (n: number) => n * 4,
  font: {
    // System fonts; bold + tight tracking mirrors the web headline treatment.
    h1: { fontSize: 32, fontWeight: '700' as const, letterSpacing: -0.5, lineHeight: 36 },
    h2: { fontSize: 24, fontWeight: '700' as const, letterSpacing: -0.3, lineHeight: 28 },
    h3: { fontSize: 17, fontWeight: '600' as const },
    body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
    label: { fontSize: 13, fontWeight: '500' as const },
    overline: {
      fontSize: 11,
      fontWeight: '700' as const,
      letterSpacing: 1.5,
      textTransform: 'uppercase' as const,
    },
  },
}

export type Theme = typeof theme
