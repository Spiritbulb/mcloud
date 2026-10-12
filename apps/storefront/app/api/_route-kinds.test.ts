import { test } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { checkRouteKinds } from '../../../../scripts/route-kinds.mjs'

// Every API route declares its kind and shows the matching gate. See scripts/route-kinds.mjs.
test('every storefront API route declares and evidences its kind', () => {
  assert.deepEqual(checkRouteKinds(path.resolve(import.meta.dirname)), [])
})
