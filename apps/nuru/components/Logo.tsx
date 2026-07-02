import { Image, ImageStyle, StyleProp } from 'react-native';

/**
 * The Nuru sunburst — the brand's orange mark, a small light. Rendered from the
 * shipped logo asset so it matches the app icon exactly. "Nuru" means light;
 * this mark is the point of light the whole app circles.
 */
export function Logo({ size = 64, style }: { size?: number; style?: StyleProp<ImageStyle> }) {
  return (
    <Image
      source={require('@/assets/images/splash-icon.png')}
      style={[{ width: size, height: size }, style]}
      resizeMode="contain"
      accessibilityLabel="Nuru"
    />
  );
}
