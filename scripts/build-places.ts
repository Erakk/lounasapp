/**
 * Builds src/data/places.json from data/places.source.ts:
 *  - resolves coordinates (docs/places-geocoded.json or cluster centres)
 *  - computes distance + walking time from Kehräsaari
 *  - attaches lunch-list links (docs/lunch-links.json)
 *  - parses lunch hours
 * Fails loudly on any unresolved name so mistakes can't slip into the app.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { places as source, type SourcePlace } from '../data/places.source';
import { CLUSTERS, ORIGIN, type ClusterId } from '../src/data/categories';
import { parseHours } from '../src/domain/openingHours';
import type { Place } from '../src/domain/schema';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const readJson = <T>(p: string): T => JSON.parse(readFileSync(resolve(root, p), 'utf8')) as T;

const VERIFIED_AT = '2026-11-22';
const WALK_DETOUR = 1.3; // street network vs straight line
const WALK_SPEED_M_PER_MIN = 80;

interface GeoRow { name: string; lat: number | null; lon: number | null }
interface LinkRow { name: string; lunchListUrl: string; source: 'own' | 'mall' | 'aggregator'; quality: 'lunch_list' | 'lunch_info' | 'site'; checkedAt: string }

const nfc = (s: string) => s.normalize('NFC').trim();
const geoByName = new Map(readJson<GeoRow[]>('docs/places-geocoded.json').map((g) => [nfc(g.name), g]));
const linkByName = new Map(readJson<LinkRow[]>('docs/lunch-links.json').map((l) => [nfc(l.name), l]));

export function haversineM(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const errors: string[] = [];

function resolveCoords(s: SourcePlace): { lat: number; lon: number } {
  if (Array.isArray(s.geo)) return { lat: s.geo[0], lon: s.geo[1] };
  if (s.geo.startsWith('@')) {
    const c = CLUSTERS[s.geo.slice(1) as ClusterId];
    if (c) return { lat: c.lat, lon: c.lon };
  }
  const g = geoByName.get(nfc(s.geo));
  if (!g || g.lat == null || g.lon == null) {
    errors.push(`${s.id}: no coordinates for geo "${s.geo}"`);
    return { lat: ORIGIN.lat, lon: ORIGIN.lon };
  }
  return { lat: g.lat, lon: g.lon };
}

function resolveLinks(s: SourcePlace): Place['links'] {
  const links: Place['links'] = {};
  if (s.web) links.website = s.web;
  if (s.phone) links.phone = s.phone;
  if (s.link === null) return links;
  const key = nfc(s.link ?? s.name);
  const l = linkByName.get(key);
  if (!l) {
    if (s.link !== undefined) errors.push(`${s.id}: lunch link "${s.link}" not found in lunch-links.json`);
    return links; // name default not found = simply no link
  }
  links.lunchList = l.lunchListUrl;
  links.lunchListQuality = l.quality;
  links.lunchListSource = l.source;
  links.lunchListCheckedAt = l.checkedAt;
  return links;
}

const built: Place[] = source.map((s) => {
  const { lat, lon } = resolveCoords(s);
  const distanceM = Math.round(haversineM(ORIGIN, { lat, lon }));
  let lunchHours: Place['lunchHours'] = {};
  try {
    lunchHours = parseHours(s.hours) as Place['lunchHours'];
  } catch (e) {
    errors.push(`${s.id}: ${(e as Error).message}`);
  }
  const grp = typeof s.grp === 'number' ? { max: s.grp } : s.grp;
  const [level, ...reasons] = s.risk;
  const place: Place = {
    id: s.id,
    name: s.name,
    address: `${s.addr}, Tampere`,
    lat: Math.round(lat * 1e6) / 1e6,
    lon: Math.round(lon * 1e6) / 1e6,
    distanceM,
    walkMin: Math.max(1, Math.round((distanceM * WALK_DETOUR) / WALK_SPEED_M_PER_MIN)),
    ...(s.cluster ? { clusterId: s.cluster } : {}),
    categories: s.cat,
    format: s.fmt,
    price: s.price ?? {},
    priceVerified: s.ok ?? false,
    includes: s.inc ?? [],
    lunchHours,
    group: {
      comfortMax: grp.max,
      ...(grp.seats ? { seats: grp.seats } : {}),
      ...(grp.bookFrom ? { bookingRequiredFrom: grp.bookFrom } : {}),
      ...(grp.book !== undefined ? { acceptsLunchBooking: grp.book } : {}),
      ...(grp.crowd ? { peakCrowding: grp.crowd } : {}),
    },
    diet: s.diet ?? [],
    dislikeRisk: { level, reasons },
    ...(s.rating ? { rating: { value: s.rating[0], count: s.rating[1], source: s.rating[2] } } : {}),
    links: resolveLinks(s),
    info: s.info ?? [],
    status: s.status ?? 'open',
    verifiedAt: VERIFIED_AT,
  };
  return place;
});

if (errors.length) {
  console.error(`✖ ${errors.length} problem(s):\n  ` + errors.join('\n  '));
  process.exit(1);
}

built.sort((a, b) => a.distanceM - b.distanceM);
const outPath = resolve(root, 'src/data/places.json');
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(built, null, 2) + '\n', 'utf8');

const withLink = built.filter((p) => p.links.lunchList).length;
const byStatus = built.reduce<Record<string, number>>((acc, p) => ((acc[p.status] = (acc[p.status] ?? 0) + 1), acc), {});
console.log(`✔ Wrote ${built.length} places to src/data/places.json`);
console.log(`  status: ${JSON.stringify(byStatus)} · with lunch-list link: ${withLink} · price verified: ${built.filter((p) => p.priceVerified).length}`);
