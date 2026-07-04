// Test-only resolve hook: lets node:test (run with --experimental-strip-types)
// resolve the repo's extensionless relative imports (tsconfig moduleResolution:
// "bundler") to their .ts sources. Registered via --import; NOT shipped.
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('.') && !/\.[mc]?[jt]s$/.test(specifier) && context.parentURL) {
    const asTs = new URL(specifier + '.ts', context.parentURL)
    if (existsSync(fileURLToPath(asTs))) {
      return nextResolve(asTs.href, context)
    }
  }
  return nextResolve(specifier, context)
}
