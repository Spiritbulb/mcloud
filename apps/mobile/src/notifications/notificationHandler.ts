// Required by expo-notifications: without a handler, incoming pushes are
// silently swallowed instead of displayed — no error, they just never show.
// Call this once, as early as possible (e.g. top of app/(app)/_layout.tsx,
// outside the component so it only runs once per JS load).
import * as Notifications from 'expo-notifications'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})