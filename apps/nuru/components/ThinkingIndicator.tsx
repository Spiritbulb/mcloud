import { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, Easing, StyleSheet, AccessibilityInfo } from 'react-native';
import { Logo } from '@/components/Logo';
import { theme } from '@/theme';

// Live model status → human label. Driven by the real SSE status events from the
// chat stream (thinking → searching_notes → writing), not a blind cycle.
const LABELS: Record<string, string> = {
  thinking: 'Thinking…',
  searching_notes: 'Searching your notes…',
  writing: 'Writing…',
};

/**
 * AI activity indicator: the Nuru sunburst turning slowly while the current model
 * status shows beneath it. Respects reduce-motion (holds still). Shown while the
 * assistant is composing a reply.
 */
export function ThinkingIndicator({ size = 40, status }: { size?: number; status?: string }) {
  const spin = useRef(new Animated.Value(0)).current;
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

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const label = (status && LABELS[status]) || 'Thinking…';

  return (
    <View style={styles.wrap} accessibilityLabel={`Nuru is ${label}`}>
      <Animated.View style={{ transform: [{ rotate }] }}>
        <Logo size={size} />
      </Animated.View>
      <Text style={styles.phrase}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  phrase: { color: theme.colors.textMuted, fontSize: 14 },
});
