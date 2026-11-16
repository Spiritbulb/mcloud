#!/usr/bin/env node
// Re-takes the product shots used on the marketing pages (apps/storefront/public/marketing and
// apps/web/public/marketing) from a real store, frames them in CSS-drawn browser and phone frames,
// and writes WebP files. Run it after a UI change makes the shots look out of date.
//
//   1. Run the storefront (:3001) and web (:3000) dev servers.
//   2. Sign in once and save the session: MCLOUD_SESSION=/path/session.json (a Playwright
//      storageState file; see the run-mcloud skill).
//   3. node scripts/marketing-shots.mjs
//
// Env: MCLOUD_SESSION (required), SHOT_STORE (default yours-truly), SHOT_ORG (default spiritb),
// CHROMIUM (path to a Chromium binary, if Playwright's own is not installed).
// Needs `playwright-core` (npx playwright install chromium) and `sharp` (installed with Next).
//
// Privacy: the signed-in person's name and email are hidden, and the store's real paybill and
// account number are swapped for placeholders. The script stops if any of them is still visible.

import { createRequire } from 'node:module'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(join(ROOT, 'package.json'))
const load = (name) => {
    try { return require(name) } catch { console.error(`Missing ${name}. Install it (not a repo dependency): npm i --no-save ${name}`); process.exit(1) }
}
const { chromium } = load('playwright-core')
const sharp = load('sharp')

const SESSION = process.env.MCLOUD_SESSION
if (!SESSION) { console.error('Set MCLOUD_SESSION to a saved Playwright session (storageState) file.'); process.exit(1) }
const STORE = process.env.SHOT_STORE ?? 'yours-truly'
const ORG = process.env.SHOT_ORG ?? 'spiritb'
const SF = 'http://localhost:3001'
const RAW = join(tmpdir(), 'mcloud-marketing-raw')
mkdirSync(RAW, { recursive: true })

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM, args: ['--no-sandbox', '--allow-file-access-from-files'] })

/** Hide the dev badge and anything that names the signed-in person; replace payment details. */
async function scrub(page, { paybill, account }) {
    await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' })
    const person = await page.evaluate(() => document.querySelector('[data-user-email]')?.textContent ?? null)
    await page.evaluate(({ paybill, account }) => {
        const swap = (t) => (paybill ? t.replaceAll(paybill, '123456') : t).replaceAll(account || '\u0000', 'YOURSTORE')
        const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
        for (let n = walk.nextNode(); n; n = walk.nextNode()) n.nodeValue = swap(n.nodeValue)
        for (const i of document.querySelectorAll('input')) i.value = swap(i.value)
        // The account menu at the foot of the sidebar shows the signed-in person.
        // Only rendered elements: page data in <script> also holds the email, and hiding its parent
        // would blank the whole page.
        for (const el of document.querySelectorAll('body *:not(script):not(style):not(template):not(noscript)')) {
            if (el.children.length === 0 && el.getClientRects().length > 0 && /@[\w-]+\.[\w.]+/.test(el.textContent || '')) {
                (el.closest('button, a') || el).style.visibility = 'hidden'
            }
        }
    }, { paybill, account })
    const text = await page.evaluate(() => document.body.innerText + ' ' + [...document.querySelectorAll('input')].map((i) => i.value).join(' '))
    if (text.trim().length < 200) throw new Error(`Page looks blank after scrubbing: ${page.url()}`)
    const leaks = [paybill, account, person].filter((v) => v && text.includes(v))
    if (/@[\w-]+\.[\w.]+/.test(text.replace(/you@example\.com/g, ''))) leaks.push('an email address')
    if (leaks.length) throw new Error(`Private details still visible on ${page.url()}: ${leaks.join(', ')}`)
}

async function shot(name, url, { width, height, phone = false, before } = {}) {
    const ctx = await browser.newContext({ storageState: SESSION, viewport: { width, height }, isMobile: phone, hasTouch: phone, deviceScaleFactor: 2 })
    const page = await ctx.newPage()
    await page.goto(url, { timeout: 120000 })
    await page.waitForTimeout(4000)
    if (before) await before(page)
    // Payment details as the checkout shows them, read from the page so they can be swapped out.
    const details = await page.evaluate(() => {
        const nums = [...document.body.innerText.matchAll(/(?:Business Number|Till Number|Account Number):?\s*([A-Z0-9-]{4,})/gi)].map((m) => m[1])
        return { paybill: nums[0] ?? null, account: nums[1] ?? null }
    })
    await scrub(page, details)
    await page.screenshot({ path: join(RAW, `${name}.png`) })
    await ctx.close()
    console.log('shot', name)
}

const desktop = { width: 1440, height: 900 }
const phone = { width: 390, height: 844, phone: true }
await shot('store-home-desktop', `${SF}/store/${STORE}`, desktop)
await shot('store-grid-desktop', `${SF}/store/${STORE}`, {
    ...desktop,
    before: (p) => p.evaluate(() => { const h = document.querySelectorAll('section h2')[0]; if (h) scrollTo(0, h.getBoundingClientRect().top + scrollY - 160) }).then(() => p.waitForTimeout(1200)),
})
await shot('store-home-phone', `${SF}/store/${STORE}`, phone)
await shot('product-phone', `${SF}/store/${STORE}/products`, {
    ...phone,
    before: async (p) => { await p.locator(`a[href*="/store/${STORE}/"]`).filter({ has: p.locator('img') }).first().click(); await p.waitForTimeout(3000) },
})
await shot('checkout-phone', `${SF}/store/${STORE}/products`, {
    ...phone,
    before: async (p) => {
        await p.locator(`a[href*="/store/${STORE}/"]`).filter({ has: p.locator('img') }).first().click()
        await p.waitForTimeout(3000)
        await p.getByRole('button', { name: /add to cart/i }).first().click()
        await p.waitForTimeout(1500)
        await p.goto(`${SF}/store/${STORE}/checkout`)
        await p.waitForTimeout(3500)
        const tel = p.locator('input[type="tel"]').first()
        if (await tel.count()) await tel.fill('0712 345 678')
    },
})
await shot('overview-desktop', `${SF}/org/${ORG}/${STORE}/settings`, desktop)
await shot('editor-desktop', `${SF}/org/${ORG}/${STORE}/settings/editor`, desktop)

// ── Frames ──────────────────────────────────────────────────────────────────────────────────────
const img = (n) => 'file://' + join(RAW, `${n}.png`)
const css = `*{box-sizing:border-box}body{margin:0;background:transparent;font-family:system-ui,sans-serif}
.stage{position:relative;padding:40px}
.browser{border-radius:14px;background:#fff;box-shadow:0 30px 80px -20px rgba(15,23,42,.35),0 0 0 1px rgba(15,23,42,.08);overflow:hidden}
.bar{height:38px;background:#f1f3f6;display:flex;align-items:center;gap:7px;padding:0 14px;border-bottom:1px solid #e3e6ea}
.dot{width:11px;height:11px;border-radius:50%;background:#d5d9df}
.url{margin-left:18px;flex:1;max-width:420px;height:22px;border-radius:6px;background:#fff;border:1px solid #e3e6ea;font-size:12px;color:#6b7280;display:flex;align-items:center;padding:0 10px}
.browser img,.phone img{display:block;width:100%}
.phone{border-radius:44px;background:#0f172a;padding:12px;box-shadow:0 30px 70px -18px rgba(15,23,42,.45)}
.screen{border-radius:33px;overflow:hidden;position:relative;background:#fff;padding-top:40px}
.notch{position:absolute;top:10px;left:50%;transform:translateX(-50%);width:96px;height:26px;border-radius:14px;background:#0f172a}`
const frame = (n, url, w) => `<div class="browser" style="width:${w}px"><div class="bar"><span class="dot"></span><span class="dot"></span><span class="dot"></span><span class="url">${url}</span></div><img src="${img(n)}"></div>`
const handset = (n, w) => `<div class="phone" style="width:${w}px"><div class="screen"><span class="notch"></span><img src="${img(n)}"></div></div>`
const site = `app.mcloud.co.ke/${STORE}`

const outputs = {
    'storefront-hero': { apps: ['storefront'], html: `<div class="stage" style="width:1400px;height:900px">${frame('store-home-desktop', site, 1120)}<div style="position:absolute;right:40px;bottom:30px">${handset('checkout-phone', 300)}</div></div>` },
    'storefront-grid': { apps: ['web'], html: `<div class="stage" style="width:1200px">${frame('store-grid-desktop', site, 1120)}</div>` },
    'phone-shop': { apps: ['storefront'], html: `<div class="stage" style="width:420px">${handset('store-home-phone', 340)}</div>` },
    'phone-product': { apps: ['storefront'], html: `<div class="stage" style="width:420px">${handset('product-phone', 340)}</div>` },
    'phone-checkout': { apps: ['storefront', 'web'], html: `<div class="stage" style="width:420px">${handset('checkout-phone', 340)}</div>` },
    'dashboard-overview': { apps: ['storefront', 'web'], html: `<div class="stage" style="width:1200px">${frame('overview-desktop', 'app.mcloud.co.ke/org/…/settings', 1120)}</div>` },
    'dashboard-editor': { apps: ['storefront', 'web'], html: `<div class="stage" style="width:1200px">${frame('editor-desktop', 'app.mcloud.co.ke/org/…/settings/editor', 1120)}</div>` },
}
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 }, deviceScaleFactor: 2 })
const tmpHtml = join(RAW, 'frame.html')
for (const [name, { apps, html }] of Object.entries(outputs)) {
    writeFileSync(tmpHtml, `<!doctype html><style>${css}</style><body>${html}</body>`)
    await page.goto('file://' + tmpHtml)
    await page.waitForTimeout(400)
    const png = await page.locator('.stage').screenshot({ omitBackground: true })
    for (const app of apps) {
        const out = join(ROOT, 'apps', app, 'public', 'marketing', `${name}.webp`)
        mkdirSync(dirname(out), { recursive: true })
        await sharp(png).webp({ quality: 78, alphaQuality: 90, effort: 6 }).toFile(out)
        const kb = Math.round(readFileSync(out).length / 1024)
        console.log(`${app}/public/marketing/${name}.webp ${kb} KB${kb > 200 ? '  (over the 200 KB budget)' : ''}`)
    }
}
await browser.close()
