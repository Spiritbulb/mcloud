// Shop routes act for the shopper in the verified token. Nothing that says WHO (shopper,
// customer) or WHERE (store, vendor) may come from the request body: that would let one shopper
// act as another, or price an order against a store of their choosing.
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

const here = path.dirname(new URL(import.meta.url).pathname)
const files = [path.resolve(here, '../../../../../lib/reach/checkout.ts')]
const walk = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name)
        if (e.isDirectory()) walk(p)
        else if (e.name === 'route.ts') files.push(p)
    }
}
walk(here)
assert.ok(files.length >= 5, 'expected the shop routes and checkout.ts')

const FORBIDDEN = /\bbody\??\.(store_?id|storeId|customer_?id|customerId|shopper_?id|shopperId|vendor_?id|vendorId|user_?id|userId|email|price|total)\b/
for (const f of files) {
    const src = readFileSync(f, 'utf8')
    assert.doesNotMatch(src, FORBIDDEN, `${path.relative(here, f)} reads identity or money from the request body`)
}
console.log(`shop body-trust: ${files.length} files ok`)
