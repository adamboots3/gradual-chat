/**
 * Dev-only helper: captures the four designed states into docs/screenshots/.
 *
 *   node scripts/capture.mjs            # uses the running dev servers
 *   BASE_URL=http://localhost:4000 node scripts/capture.mjs
 *
 * Requires a Chrome/Edge install (uses the system browser, no bundled binary).
 */
import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5173';
const OUT_DIR = 'docs/screenshots';

const CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);

const executablePath = CANDIDATES.find((candidate) => existsSync(candidate));
if (!executablePath) {
  console.error('No Chrome/Edge binary found. Set CHROME_PATH to a browser executable.');
  process.exit(1);
}

await mkdir(OUT_DIR, { recursive: true });

const browser = await chromium.launch({ executablePath, headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 916 },
  deviceScaleFactor: 2,
  colorScheme: 'dark',
});
const page = await context.newPage();

// Keep the pointer away from message rows so hover-only affordances stay hidden.
const parkPointer = () => page.mouse.move(24, 880);

await page.goto(BASE_URL, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'Sign in' }).click();
await page.getByRole('button', { name: 'Account menu' }).waitFor();
await page.getByText('Share your story').first().waitFor();
await parkPointer();

// 01 — default conversation
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT_DIR}/01-conversation.png` });

// 02 — hover actions on a message
await page
  .getByText('Check out Vanilla Forums (11/17 - 11/18/20) for free.', { exact: true })
  .first()
  .hover();
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT_DIR}/02-hover-actions.png` });

// 03 — quote reply in the composer
await page.getByRole('button', { name: 'Quote reply' }).first().click();
await page.getByLabel(/Message Share your story/).fill('Many thanks!');
await parkPointer();
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT_DIR}/03-quote-reply.png` });

// 04 — @mention autocomplete
await page.getByLabel(/Message Share your story/).fill('Reminder for @');
await page.waitForTimeout(600);
await parkPointer();
await page.screenshot({ path: `${OUT_DIR}/04-mentions.png` });

await browser.close();
console.log(`Screenshots written to ${OUT_DIR}`);
