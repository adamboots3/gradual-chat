/**
 * Dev-only smoke test for the realtime path.
 *
 *   node scripts/realtime-smoke.mjs
 *
 * Opens two isolated browser contexts (Jenny and Devon), sends a message from
 * one and asserts the other receives it 鈥?and that the unread badge appears when
 * the recipient is looking at a different channel.
 */
import { chromium } from 'playwright-core';
import { existsSync } from 'node:fs';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5173';
const CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
].filter(Boolean);
const executablePath = CANDIDATES.find((candidate) => existsSync(candidate));
if (!executablePath) {
  console.error('No Chrome/Edge binary found. Set CHROME_PATH.');
  process.exit(1);
}

const browser = await chromium.launch({ executablePath, headless: true });

async function signIn(email) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 916 } });
  const page = await context.newPage();
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByRole('button', { name: 'Account menu' }).waitFor();
  await page.getByText('Share your story').first().waitFor();
  return { context, page };
}

const jenny = await signIn('jenny@gradual.com');
const devon = await signIn('devon@gradual.com');

const text = `realtime smoke ${Date.now()}`;
await jenny.page.getByLabel(/Message Share your story/).fill(text);
await jenny.page.getByLabel(/Message Share your story/).press('Enter');

// 1. the other side receives it
await devon.page.getByText(text).waitFor({ timeout: 5000 });
console.log('鉁?message delivered to the other client');

// 2. switch Devon away and check the unread badge appears
await devon.page.getByRole('button', { name: 'Product team', exact: true }).click();
const second = `unread smoke ${Date.now()}`;
await jenny.page.getByLabel(/Message Share your story/).fill(second);
await jenny.page.getByLabel(/Message Share your story/).press('Enter');

const row = devon.page.getByRole('button', { name: 'Share your story', exact: true });
await row.waitFor();
await row.locator('span.bg-badge').first().waitFor({ state: 'visible', timeout: 5000 });
console.log('鉁?unread badge appears while the recipient is in another channel');

// 3. opening the channel clears it
await row.click();
await devon.page.waitForTimeout(800);
const badgeCount = await row.locator('span.bg-badge').count();
if (badgeCount > 0) throw new Error('Unread badge should be cleared after opening the channel');
console.log('鉁?unread badge clears after opening the channel');

await jenny.context.close();
await devon.context.close();
await browser.close();
console.log('Realtime smoke test passed.');

