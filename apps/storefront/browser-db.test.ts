import { test } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { filesImportingBrowserDb } from '../../scripts/browser-db-guard.mjs'

// Merchant data goes through server actions (lib/admin/*). The only browser Supabase client is the
// shopper's Auth session; it must never query tables.
test('browser Supabase clients are limited to the shopper auth context', () => {
  assert.deepEqual(filesImportingBrowserDb(path.resolve(import.meta.dirname)), ['contexts/CustomerAuthContext.tsx'])
})
