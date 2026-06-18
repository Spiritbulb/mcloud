// Thin wrapper so call sites don't import expo-haptics directly and failures are
// swallowed (haptics are best-effort polish, never a hard dependency).
import * as Haptics from 'expo-haptics'

export const haptic = {
  success: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}) },
  light: () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}) },
}
