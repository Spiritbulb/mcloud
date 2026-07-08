import { Image, ImageStyle, StyleProp } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

const TEAL_LOGO = require('@/assets/images/logo-teal.png');
const AMBER_LOGO = require('@/assets/images/splash-icon.png');

/**
 * The Nuru sunburst — the brand's light mark. It follows the palette: the teal
 * mark in light mode, the amber mark in dark, matching the primary color of each
 * scheme. "Nuru" means light; this mark is the point of light the whole app
 * circles.
 */
export function Logo({ size = 64, style }: { size?: number; style?: StyleProp<ImageStyle> }) {
  const { scheme } = useTheme();
  return (
    <Image
      source={scheme === 'dark' ? AMBER_LOGO : TEAL_LOGO}
      style={[{ width: size, height: size }, style]}
      resizeMode="contain"
      accessibilityLabel="Nuru"
    />
  );
}
