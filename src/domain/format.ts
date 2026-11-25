import type { Place } from './schema';
import { weekdayOf } from './openingHours';

const eur = (n: number) => n.toLocaleString('fi-FI', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

/** Short price for cards: "13,90 €", "10,90–13,90 €", "2,55 €/100 g" or "" when unknown. */
export function priceLabel(p: Place): string {
  const { lunch, min, max, note } = p.price;
  if (p.format === 'by_weight' && note) return note;
  if (min !== undefined && max !== undefined && min !== max) return `${eur(min).replace(' €', '')}–${eur(max)}`;
  if (lunch !== undefined) return eur(lunch);
  if (min !== undefined) return `alk. ${eur(min)}`;
  return '';
}

/** Walking time stops being useful past half an hour: farther places show kilometres instead. */
export const WALK_LIMIT_MIN = 30;

const km = (m: number) => (m / 1000).toLocaleString('fi-FI', { maximumFractionDigits: 1 }) + ' km';

/** "🚶 12 min" for walkable places, "📍 6,5 km" for the rest. */
export function distanceLabel(p: Pick<Place, 'walkMin' | 'distanceM'>): string {
  return p.walkMin <= WALK_LIMIT_MIN ? `🚶 ${p.walkMin} min` : `📍 ${km(p.distanceM)}`;
}

/** Detail line: "🚶 12 min · 950 m" or "📍 6,5 km · kävellen n. 1 h 25 min". */
export function distanceDetail(p: Pick<Place, 'walkMin' | 'distanceM'>): string {
  if (p.walkMin <= WALK_LIMIT_MIN) return `🚶 ${p.walkMin} min · ${p.distanceM} m`;
  const h = Math.floor(p.walkMin / 60);
  const m = p.walkMin % 60;
  return `📍 ${km(p.distanceM)} · kävellen n. ${h ? `${h} h ${m} min` : `${m} min`}`;
}

/** Today's lunch hours, e.g. "10.30–14" or "" if no lunch today. */
export function hoursToday(p: Place, date = new Date()): string {
  const ranges = p.lunchHours[weekdayOf(date)];
  if (!ranges?.length) return '';
  return ranges.map((r) => `${short(r.from)}–${short(r.to)}`).join(', ');
}

function short(t: string): string {
  const [h, m] = t.split(':');
  return m === '00' ? String(Number(h)) : `${Number(h)}.${m}`;
}

export { short as shortTime };
