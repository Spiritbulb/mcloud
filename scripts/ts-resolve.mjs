// Usage: node --import ../../scripts/ts-resolve.mjs --test <files>
import { register } from 'node:module'
register('./ts-resolve-hooks.mjs', import.meta.url)
