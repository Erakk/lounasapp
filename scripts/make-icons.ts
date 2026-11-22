/**
 * Renders public/icon.svg to the PNG icons phones need (iOS ignores SVG touch icons).
 * Run: npx tsx scripts/make-icons.ts
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const svg = readFileSync(resolve(root, 'public/icon.svg'), 'utf8');

const TARGETS = [
  { file: 'icon-192.png', size: 192, pad: 0 },
  { file: 'icon-512.png', size: 512, pad: 0 },
  // Maskable: Android crops to a circle/squircle, so keep the artwork inside the central 80 %.
  { file: 'icon-maskable-512.png', size: 512, pad: 0.1, bg: '#C8364A' },
  { file: 'apple-touch-icon.png', size: 180, pad: 0 },
];

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
for (const t of TARGETS) {
  const inner = Math.round(t.size * (1 - 2 * t.pad));
  await page.setViewportSize({ width: t.size, height: t.size });
  await page.setContent(
    `<html><body style="margin:0;background:${t.bg ?? 'transparent'};display:grid;place-items:center;width:${t.size}px;height:${t.size}px">
      <div style="width:${inner}px;height:${inner}px">${svg.replace('<svg ', `<svg width="${inner}" height="${inner}" `)}</div>
    </body></html>`,
  );
  await page.screenshot({ path: resolve(root, 'public', t.file), omitBackground: !t.bg });
  console.log(`✔ public/${t.file} (${t.size}×${t.size})`);
}
await browser.close();
