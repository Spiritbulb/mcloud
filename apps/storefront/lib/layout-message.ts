// The Editor's preview shows an UNSAVED layout. Home sections already follow it (the
// preview route renders with the draft settings), but the nav and footer come from
// the saved store in the layout, so the Editor tells the framed page which theme to
// draw them in. Same containment as PreviewListener: only inside a frame, only from
// this app's own origin, and only a known theme id.

import { isStoreThemeId, type StoreThemeId } from './store-themes'

export const LAYOUT_MESSAGE = 'mcloud:layout'

export function layoutThemeFrom(
  event: { origin: string; data: unknown },
  ownOrigin: string,
  framed: boolean,
): StoreThemeId | null {
  if (!framed || event.origin !== ownOrigin) return null
  const data = event.data
  if (!data || typeof data !== 'object') return null
  const { type, themeId } = data as { type?: unknown; themeId?: unknown }
  if (type !== LAYOUT_MESSAGE || !isStoreThemeId(themeId)) return null
  return themeId
}
