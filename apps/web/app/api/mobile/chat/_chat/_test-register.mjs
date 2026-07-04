// Registers the extensionless-.ts resolve hook for node:test runs. Use as:
//   node --experimental-strip-types --import ./_chat/_test-register.mjs --test ...
import { register } from 'node:module'
register('./_test-resolve.mjs', import.meta.url)
