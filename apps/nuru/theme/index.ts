// Nuru — dual light/dark theme. "Nuru" means light in Swahili. Teal (the logo
// color) leads in light mode; amber leads in dark, where teal has too little
// contrast on charcoal. Fraunces serif carries the brand voice; the system sans
// does the quiet UI work.

export type Scheme = 'light' | 'dark';

export type Colors = {
  bg: string;
  surface: string;
  surfaceAlt: string;
  primary: string;
  primarySoft: string;
  accent: string;
  text: string;
  textMuted: string;
  border: string;
  danger: string;
  success: string;
  onPrimary: string;
  bubbleUser: string;
  bubbleAi: string;
};

export const lightColors: Colors = {
  bg: '#F7F6F3',          // warm paper — not pure white
  surface: '#FFFFFF',     // white cards lift over paper
  surfaceAlt: '#ECEAE5',  // pressed / active
  primary: '#14505F',     // logo teal — brand + actions
  primarySoft: '#DCEAEE', // teal-tinted chips
  accent: '#C77D28',      // amber secondary
  text: '#1C2B30',        // teal-ink (not pure black)
  textMuted: '#5E6E73',   // metadata only
  border: '#E3E0DA',      // hairline
  danger: '#C4553B',      // errors
  success: '#3DAA6E',     // correct / completion
  onPrimary: '#FFFFFF',   // text on teal fills
  bubbleUser: '#14505F',  // user bubble (teal)
  bubbleAi: '#FAFAF7',    // assistant bubble (warm white)
};

export const darkColors: Colors = {
  bg: '#262624',          // flat neutral charcoal
  surface: '#302F2D',     // raised cards / input bar
  surfaceAlt: '#3A3937',  // pressed / active
  primary: '#FF9800',     // amber — primary on charcoal
  primarySoft: '#3A2A14', // amber-tinted chips
  accent: '#4F9DB5',      // teal secondary
  text: '#EDE7E1',        // warm off-white
  textMuted: '#9B8F85',   // taupe
  border: '#403F3C',      // hairline
  danger: '#E0876F',      // desaturated coral
  success: '#5CC98C',     // correct / completion
  onPrimary: '#1A1204',   // near-black on amber fills
  bubbleUser: '#FF9800',  // user bubble (amber)
  bubbleAi: '#302F2D',    // assistant bubble (raised surface)
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
export const radii = { sm: 8, md: 14, lg: 22, pill: 999 };

// Font family names registered in app/_layout.tsx via useFonts().
export const fonts = {
  display: 'Fraunces_600SemiBold',
  displayLight: 'Fraunces_500Medium',
};

export function makeTypography(colors: Colors) {
  return {
    // Serif — brand wordmark and screen titles only.
    brand: { fontFamily: fonts.display, fontSize: 40, color: colors.text, letterSpacing: 0.5 },
    title: { fontFamily: fonts.display, fontSize: 26, color: colors.text },
    // Sans — everything else.
    heading: { fontSize: 18, fontWeight: '600' as const, color: colors.text },
    body: { fontSize: 16, color: colors.text },
    muted: { fontSize: 14, color: colors.textMuted },
  };
}

export function makeTheme(scheme: Scheme) {
  const colors = scheme === 'dark' ? darkColors : lightColors;
  return { colors, spacing, radii, fonts, typography: makeTypography(colors) };
}

export type Theme = ReturnType<typeof makeTheme>;
