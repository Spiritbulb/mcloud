import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// @next/mdx's loader replaces `plugin[0]` in place when a plugin is given as ['name', options].
// That mutates the Turbopack rule inside the live config, Turbopack sees a changed config on every
// request, and `next dev` reloads the page in a loop ("HMR hash mismatch"). A bare string plugin
// is resolved into a local variable instead, so plugins must be listed as plain strings.
test('MDX plugins are listed as plain strings', () => {
    const src = readFileSync(new URL('./next.config.ts', import.meta.url), 'utf8')
    const options = src.match(/createMDX\(\{([\s\S]*?)\}\)/)?.[1] ?? ''
    assert.ok(options.includes('remarkPlugins'), 'expected the MDX options to list remark plugins')
    assert.doesNotMatch(options, /Plugins:\s*\[\s*\[/, 'a plugin is wrapped in an array')
})
