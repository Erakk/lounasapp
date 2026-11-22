/**
 * Validates src/data/places.json against the schema plus data-quality rules.
 * Errors fail the run (exit 1); warnings are printed but allowed.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PlaceSchema, type Place } from '../src/domain/schema';
import { CATEGORIES } from '../src/data/categories';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const raw: unknown = JSON.parse(readFileSync(resolve(root, 'src/data/places.json'), 'utf8'));

const errors: string[] = [];
const warnings: string[] = [];

if (!Array.isArray(raw)) {
  console.error('✖ places.json must be an array');
  process.exit(1);
}

const places: Place[] = [];
raw.forEach((item, i) => {
  const r = PlaceSchema.safeParse(item);
  if (!r.success) {
    const id = (item as { id?: string }).id ?? `#${i}`;
    for (const issue of r.error.issues) errors.push(`${id}: ${issue.path.join('.')} – ${issue.message}`);
  } else {
    places.push(r.data);
  }
});

// ── Cross-record rules ──
const seen = new Set<string>();
for (const p of places) {
  if (seen.has(p.id)) errors.push(`${p.id}: duplicate id`);
  seen.add(p.id);

  if (new Set(p.categories).size !== p.categories.length) errors.push(`${p.id}: duplicate category`);

  // "Buffet" category must match reality: every buffet is in it, and anything else in it must say why.
  if (p.format === 'buffet' && !p.categories.includes('buffet')) errors.push(`${p.id}: format buffet but no 'buffet' category`);
  if (p.categories.includes('buffet') && p.format !== 'buffet' && ![p.price.note, ...p.info].some((t) => /buffet/i.test(t ?? '')))
    errors.push(`${p.id}: in 'buffet' category but format is ${p.format} and nothing mentions a buffet`);

  const { lunch, min, max } = p.price;
  if (min !== undefined && max !== undefined && min > max) errors.push(`${p.id}: price.min > price.max`);
  for (const [k, v] of Object.entries(p.price)) {
    if (typeof v === 'number' && (v < 2 || v > 60)) errors.push(`${p.id}: price.${k}=${v} looks wrong`);
  }
  if (p.priceVerified && lunch === undefined && min === undefined && p.price.soup === undefined && !p.price.note)
    errors.push(`${p.id}: priceVerified but no price`);

  const days = Object.keys(p.lunchHours);
  if (p.status === 'open' && days.length === 0) errors.push(`${p.id}: status open but no lunch hours`);
  if (p.status === 'verify' && days.length === 0) warnings.push(`${p.id}: no lunch hours (verify)`);
  for (const [day, ranges] of Object.entries(p.lunchHours)) {
    for (const r of ranges ?? []) {
      if (r.from < '06:00' || r.to > '23:59') warnings.push(`${p.id}: unusual ${day} hours ${r.from}-${r.to}`);
    }
  }

  if (p.distanceM > 3000) warnings.push(`${p.id}: ${p.distanceM} m from Kehräsaari`);
  if (p.dislikeRisk.level === 'H' && p.dislikeRisk.reasons.length === 0) errors.push(`${p.id}: risk H needs a reason`);
  if (p.group.bookingRequiredFrom && p.group.bookingRequiredFrom > p.group.comfortMax + 1)
    warnings.push(`${p.id}: booking required from ${p.group.bookingRequiredFrom} but comfortMax ${p.group.comfortMax}`);
  if (!p.links.lunchList && !p.links.website && p.status === 'open') warnings.push(`${p.id}: no lunch-list link or website`);
  if (p.price.lunch === undefined && p.price.min === undefined && p.status === 'open' && p.format !== 'by_weight')
    warnings.push(`${p.id}: no price`);
}

// ── Coverage summary ──
const byCat = new Map<string, number>();
for (const p of places) for (const c of p.categories) byCat.set(c, (byCat.get(c) ?? 0) + 1);
const emptyCats = CATEGORIES.filter((c) => !byCat.has(c.id)).map((c) => c.id);
if (emptyCats.length) warnings.push(`categories with no places: ${emptyCats.join(', ')}`);

console.log(`Checked ${raw.length} places`);
console.log(
  '  per category: ' +
    CATEGORIES.map((c) => `${c.emoji}${c.id} ${byCat.get(c.id) ?? 0}`).join(' · '),
);
if (warnings.length) console.log(`⚠ ${warnings.length} warning(s):\n  ` + warnings.join('\n  '));
if (errors.length) {
  console.error(`✖ ${errors.length} error(s):\n  ` + errors.join('\n  '));
  process.exit(1);
}
console.log('✔ places.json is valid');
