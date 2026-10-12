import { test } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { filesImportingBrowserDb } from '../../scripts/browser-db-guard.mjs'

// Web reads and writes tables only on the server. The two password forms use Supabase Auth only.
test('browser Supabase clients are limited to the legacy password forms', () => {
  assert.deepEqual(filesImportingBrowserDb(path.resolve(import.meta.dirname)), [
    'components/forgot-password-form.tsx',
    'components/update-password-form.tsx',
  ])
})
