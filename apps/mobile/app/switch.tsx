// Transitional screen used only when switching between stores from inside the
// store-tabs stack. Pushing directly from [storeSlug] to a new [storeSlug] can
// no-op (same dynamic segment, router treats it as "already here"). Routing
// through this screen first guarantees a real navigation, then replaces into
// the target store.
import * as React from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useTheme } from '@/lib/theme'

export default function SwitchStoreScreen() {
  const t = useTheme()
  const router = useRouter()
  const { slug } = useLocalSearchParams<{ slug: string }>()

  React.useEffect(() => {
    if (!slug) {
      router.replace('/' as never)
      return
    }
    router.replace(`/store/${slug}` as never)
  }, [slug, router])

  return (
    <View style={[styles.fill, { backgroundColor: t.colors.background }]}>
      <ActivityIndicator size="small" color={t.colors.primary} />
    </View>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
})