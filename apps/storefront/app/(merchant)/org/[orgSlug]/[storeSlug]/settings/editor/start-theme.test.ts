import assert from 'node:assert/strict'
import { withoutThemeParam } from './start-theme'

// The dashboard's Preview links to the Editor with ?theme=<id>. Once applied it must
// leave the URL, or a reload after saving a different layout re-applies it as an edit.
assert.equal(withoutThemeParam('https://a.b/org/o/s/settings/editor?theme=classic-2'), 'https://a.b/org/o/s/settings/editor')
assert.equal(withoutThemeParam('https://a.b/e?x=1&theme=soft#h'), 'https://a.b/e?x=1#h')
assert.equal(withoutThemeParam('https://a.b/e?x=1'), 'https://a.b/e?x=1')
console.log('start-theme.test.ts OK')
