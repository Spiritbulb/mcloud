// Run with: node --experimental-strip-types scripts/verify-google-jwt.ts
import { normalizePrivateKey } from '../lib/google-jwt-pure.ts'
import assert from 'node:assert'

const escaped = 'line1\\nline2'
assert.equal(normalizePrivateKey(escaped), 'line1\nline2', 'single-escaped newlines')
const doubled = 'line1\\\\nline2'
assert.equal(normalizePrivateKey(doubled), 'line1\nline2', 'double-escaped newlines')
console.log('OK')
