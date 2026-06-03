#!/usr/bin/env node
/**
 * mcloud driver — headless Playwright script for the mcloud dev server.
 *
 * Usage:
 *   node .claude/skills/run-mcloud/driver.mjs [command] [args...]
 *
 * Commands:
 *   screenshot <url-path> [output-path]   Navigate and screenshot a page
 *   smoke                                  Run a quick smoke test across key routes
 *   nav <url-path>                         Print page title + HTTP status equivalent
 *
 * Examples:
 *   node .claude/skills/run-mcloud/driver.mjs screenshot / /tmp/home.png
 *   node .claude/skills/run-mcloud/driver.mjs screenshot /docs /tmp/docs.png
 *   node .claude/skills/run-mcloud/driver.mjs smoke
 */

import { createRequire } from 'module';
import { mkdirSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

// Resolve playwright from the project root (3 levels up from skill dir)
const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '../../..');
const require = createRequire(PROJECT_ROOT + '/package.json');
const { chromium } = require('playwright');

const BASE_URL = process.env.MCLOUD_URL ?? 'http://localhost:3000';
const SHOT_DIR = process.env.SHOT_DIR ?? '/tmp/mcloud-shots';

async function withPage(fn) {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-gpu'] });
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(30_000);
  try {
    return await fn(page);
  } finally {
    await browser.close();
  }
}

async function screenshot(urlPath, outPath) {
  // On Windows/Git Bash, absolute paths like /support get converted to
  // C:/Program Files/Git/support. Detect and reverse that transformation.
  if (urlPath && /^[A-Za-z]:\/Program Files\/Git/.test(urlPath)) {
    urlPath = urlPath.replace(/^[A-Za-z]:\/Program Files\/Git/, '') || '/';
  }
  mkdirSync(SHOT_DIR, { recursive: true });
  outPath ??= resolve(SHOT_DIR, urlPath.replace(/\//g, '_').replace(/^_/, '') + '.png');
  await withPage(async (page) => {
    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(BASE_URL + urlPath);
    await page.waitForTimeout(1500); // let client JS hydrate
    await page.screenshot({ path: outPath, fullPage: false });
    console.log(`screenshot → ${outPath}`);
    console.log('title:', await page.title());
    console.log('url:', page.url());
    if (errors.length) console.log('console errors:', errors.slice(0, 5));
  });
}

async function smoke() {
  const routes = [
    '/',
    '/docs',
    '/changelog',
    '/support',
    '/auth/login',
  ];

  mkdirSync(SHOT_DIR, { recursive: true });

  await withPage(async (page) => {
    for (const route of routes) {
      const errors = [];
      page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
      await page.goto(BASE_URL + route);
      await page.waitForTimeout(800);
      const finalUrl = page.url();
      const title = await page.title();
      const shotPath = resolve(SHOT_DIR, 'smoke' + route.replace(/\//g, '_') + '.png');
      await page.screenshot({ path: shotPath });
      const ok = !errors.length ? '✓' : '⚠';
      console.log(`${ok} ${route} → ${finalUrl.replace(BASE_URL, '')} | "${title.slice(0, 50)}"`);
      if (errors.length) console.log('  console errors:', errors.slice(0, 3));
    }
  });

  // Verify health API
  const { execSync } = await import('child_process');
  try {
    const health = execSync(`curl -sf ${BASE_URL}/api/health`, { encoding: 'utf8' });
    console.log('✓ /api/health:', health.trim());
  } catch {
    console.log('✗ /api/health: failed');
  }

  console.log(`\nScreenshots → ${SHOT_DIR}/`);
}

async function nav(urlPath) {
  await withPage(async (page) => {
    await page.goto(BASE_URL + urlPath);
    await page.waitForLoadState('domcontentloaded');
    console.log('title:', await page.title());
    console.log('url:', page.url());
  });
}

const [, , cmd, ...args] = process.argv;

switch (cmd) {
  case 'screenshot': await screenshot(args[0] ?? '/', args[1]); break;
  case 'smoke':      await smoke(); break;
  case 'nav':        await nav(args[0] ?? '/'); break;
  default:
    console.log('Commands: screenshot <path> [out], smoke, nav <path>');
    process.exit(1);
}
