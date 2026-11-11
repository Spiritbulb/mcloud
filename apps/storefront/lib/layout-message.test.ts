import assert from 'node:assert/strict'
import { layoutThemeFrom } from './layout-message'

// The Editor tells its framed preview which UNSAVED layout to show, so the nav and
// footer follow a theme switch before Save. Like PreviewListener, it is honoured
// only inside a frame and only from this app's own origin.
const own = 'https://app.mcloud.co.ke'
const msg = (data: unknown, origin = own) => ({ origin, data })

assert.equal(layoutThemeFrom(msg({ type: 'mcloud:layout', themeId: 'studio' }), own, true), 'studio')
assert.equal(layoutThemeFrom(msg({ type: 'mcloud:layout', themeId: 'classic' }), own, true), 'classic')
assert.equal(layoutThemeFrom(msg({ type: 'mcloud:layout', themeId: 'studio' }, 'https://evil.example'), own, true), null, 'other origin')
assert.equal(layoutThemeFrom(msg({ type: 'mcloud:layout', themeId: 'studio' }), own, false), null, 'not framed')
assert.equal(layoutThemeFrom(msg({ type: 'mcloud:theme', themeId: 'studio' }), own, true), null, 'other message type')
assert.equal(layoutThemeFrom(msg({ type: 'mcloud:layout', themeId: 'bogus' }), own, true), null, 'unknown id')
assert.equal(layoutThemeFrom(msg({ type: 'mcloud:layout' }), own, true), null, 'no id')
assert.equal(layoutThemeFrom(msg('mcloud:layout'), own, true), null, 'non-object data')
assert.equal(layoutThemeFrom(msg(null), own, true), null, 'null data')

console.log('layout-message.test.ts OK')
