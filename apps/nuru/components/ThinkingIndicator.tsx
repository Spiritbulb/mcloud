import { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, Easing, StyleSheet, AccessibilityInfo } from 'react-native';
import { Logo } from '@/components/Logo';
import { theme } from '@/theme';

const PHRASES = [
  'Reading your notes…',
  'Connecting ideas…',
  'Finding the thread…',
  'Thinking it through…',
  'Pulling it together…',
];

/**
 * AI activity indicator: the Nuru sunburst turning slowly while a studious
 * loading phrase cycles beneath it. Respects reduce-motion (holds still, keeps
 * cycling the words). Shown while the assistant is composing a reply.
 */
export function ThinkingIndicator({ size = 40 }: { size?: number }) {
  const spin = useRef(new Animated.Value(0)).current;
  const [phrase, setPhrase] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => mounted && setReduceMotion(v));
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      spin.stopAnimation();
      spin.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 4200, // slow, calm rotation
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [reduceMotion, spin]);

  useEffect(() => {
    const t = setInterval(() => setPhrase((p) => (p + 1) % PHRASES.length), 2200);
    return () => clearInterval(t);
  }, []);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={styles.wrap} accessibilityLabel="Nuru is thinking">
      <Animated.View style={{ transform: [{ rotate }] }}>
        <Logo size={size} />
      </Animated.View>
      <Text style={styles.phrase}>{PHRASES[phrase]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  phrase: { color: theme.colors.textMuted, fontSize: 14 },
});
