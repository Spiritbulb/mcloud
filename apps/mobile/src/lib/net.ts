// Connectivity hook. Used for UI signals (offline pill) and, later, to gate
// doomed refetches. Defaults to online so the app never falsely shows "offline".
import * as React from 'react'
import NetInfo from '@react-native-community/netinfo'

export function useIsOnline(): boolean {
  const [online, setOnline] = React.useState(true)
  React.useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      setOnline(state.isConnected !== false)
    })
    return () => unsub()
  }, [])
  return online
}
