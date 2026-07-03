// Nuru — dark theme. "Nuru" means light in Swahili: a small warm light in the
// dark, the study companion you talk to late at night. Warm near-black surfaces
// under the logo's amber-orange accent; Fraunces serif carries the brand voice,
// the system sans does the quiet UI work.

export const colors = {
  bg: '#262624',           // flat neutral charcoal (Claude-style base)
  surface: '#302F2D',      // raised cards / input bar — steps up from bg
  surfaceAlt: '#3A3937',   // pressed / active states
  primary: '#FF9800',      // logo amber-orange — brand + actions
  primarySoft: '#3A2A14',  // amber-tinted chips on dark
  accent: '#FFB74D',       // lighter amber for secondary links
  text: '#EDE7E1',         // warm off-white
  textMuted: '#9B8F85',    // taupe
  border: '#403F3C',       // hairline on charcoal
  danger: '#E0876F',       // desaturated coral for errors on dark
  onPrimary: '#1A1204',    // near-black text on amber fills
  bubbleUser: '#FF9800',   // user chat bubble (amber)
  bubbleAi: '#302F2D',     // assistant bubble (raised surface)
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
export const radii = { sm: 8, md: 14, lg: 22, pill: 999 };

// Font family names registered in app/_layout.tsx via useFonts().
export const fonts = {
  display: 'Fraunces_600SemiBold',
  displayLight: 'Fraunces_500Medium',
};

export const typography = {
  // Serif — brand wordmark and screen titles only.
  brand: { fontFamily: fonts.display, fontSize: 40, color: colors.text, letterSpacing: 0.5 },
  title: { fontFamily: fonts.display, fontSize: 26, color: colors.text },
  // Sans — everything else.
  heading: { fontSize: 18, fontWeight: '600' as const, color: colors.text },
  body: { fontSize: 16, color: colors.text },
  muted: { fontSize: 14, color: colors.textMuted },
};

export const theme = { colors, spacing, radii, fonts, typography };
export type Theme = typeof theme;
