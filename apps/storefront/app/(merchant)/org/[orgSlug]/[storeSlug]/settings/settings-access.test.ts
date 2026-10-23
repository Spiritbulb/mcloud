import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Settings pages read the store with the service-role client and trust the layout to have checked
// access. The layout hands the page to SettingsShell, a client component, and anything passed to a
// client component is serialized into the response even if it is never rendered. So the layout
// must drop the page when access failed, not leave that to the shell's error screen.
test('the settings layout does not pass the page through when access failed', () => {
    const dir = path.dirname(fileURLToPath(import.meta.url))
    const src = readFileSync(path.join(dir, 'layout.tsx'), 'utf8')
    assert.match(src, /\{initialError \|\| !initialStore \? null : children\}/)
    assert.doesNotMatch(src, /^\s*\{children\}\s*$/m)
})
