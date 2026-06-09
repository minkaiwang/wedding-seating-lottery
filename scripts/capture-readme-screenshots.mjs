/**
 * Capture README screenshots from local dev servers.
 * Prerequisite: npm run dev:stack (or dev on :3000 and lottery on :6719)
 * Run: node scripts/capture-readme-screenshots.mjs
 */
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const outDir = join(root, 'docs', 'screenshots');
mkdirSync(outDir, { recursive: true });

const seatingBase = process.env.SCREENSHOT_SEATING_URL ?? 'http://localhost:3000';

const shots = [
  { file: 'home.png', url: `${seatingBase}/?lang=zh`, label: 'landing' },
  { file: 'guests.png', url: `${seatingBase}/guests?lang=zh`, label: 'guests' },
  { file: 'seating.png', url: `${seatingBase}/seating?lang=zh`, label: 'seating' },
  { file: 'preview.png', url: `${seatingBase}/preview?lang=zh`, label: 'preview' },
  { file: 'lottery-home.png', url: 'http://localhost:6719/log-lottery/home', label: 'lottery', waitMs: 5000 },
];

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  locale: 'zh-CN',
  deviceScaleFactor: 1,
});

for (const shot of shots) {
  const page = await context.newPage();
  try {
    const res = await page.goto(shot.url, { waitUntil: 'load', timeout: 45000 });
    if (!res || !res.ok()) {
      console.warn(`Skip ${shot.label}: HTTP ${res?.status() ?? 'failed'} — ${shot.url}`);
      continue;
    }
    await page.waitForTimeout(shot.waitMs ?? 2500);
    const path = join(outDir, shot.file);
    await page.screenshot({ path, fullPage: false });
    console.log(`Saved ${path}`);
  }
  catch (e) {
    console.warn(`Skip ${shot.label}: ${e instanceof Error ? e.message : e}`);
  }
  finally {
    await page.close();
  }
}

await browser.close();
console.log('Done.');
