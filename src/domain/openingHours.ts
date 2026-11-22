import { WEEKDAYS, type TimeRange, type Weekday } from './schema';

/**
 * Parses compact lunch-hour strings such as
 *   'mon-fri 10:30-15; sat 11-15'   'mon,wed-fri 11-14'   'daily 10:30-15'
 * into { mon: [{from:'10:30', to:'15:00'}], ... }.
 * Throws on anything it does not understand, so typos fail the build.
 */
export function parseHours(spec: string | undefined): Partial<Record<Weekday, TimeRange[]>> {
  const out: Partial<Record<Weekday, TimeRange[]>> = {};
  if (!spec || !spec.trim()) return out;

  for (const segment of spec.split(';')) {
    const m = segment.trim().match(/^([a-z,\-]+)\s+(.+)$/);
    if (!m) throw new Error(`Bad hours segment "${segment}"`);
    const [, dayPart, timePart] = m as unknown as [string, string, string];
    const days = parseDays(dayPart);
    const ranges = timePart.split(',').map((t) => parseRange(t.trim()));
    for (const d of days) out[d] = [...(out[d] ?? []), ...ranges];
  }
  return out;
}

function parseDays(part: string): Weekday[] {
  if (part === 'daily') return [...WEEKDAYS];
  const result: Weekday[] = [];
  for (const piece of part.split(',')) {
    const [a, b] = piece.split('-') as [string, string | undefined];
    const i = WEEKDAYS.indexOf(a as Weekday);
    const j = b === undefined ? i : WEEKDAYS.indexOf(b as Weekday);
    if (i < 0 || j < 0 || j < i) throw new Error(`Bad day range "${piece}"`);
    for (let k = i; k <= j; k++) result.push(WEEKDAYS[k]!);
  }
  return result;
}

function parseRange(range: string): TimeRange {
  const m = range.match(/^(\d{1,2})(?::(\d{2}))?-(\d{1,2})(?::(\d{2}))?$/);
  if (!m) throw new Error(`Bad time range "${range}"`);
  const pad = (h: string, min = '00') => `${h.padStart(2, '0')}:${min}`;
  return { from: pad(m[1]!, m[2]), to: pad(m[3]!, m[4]) };
}

/** Weekday key for a JS Date (local time). */
export function weekdayOf(date: Date): Weekday {
  return WEEKDAYS[(date.getDay() + 6) % 7]!; // JS: 0 = Sunday
}

/** True if lunch is being served at the given moment. */
export function isOpenForLunch(lunchHours: Partial<Record<Weekday, TimeRange[]>>, date: Date): boolean {
  const ranges = lunchHours[weekdayOf(date)];
  if (!ranges) return false;
  const hhmm = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  return ranges.some((r) => r.from <= hhmm && hhmm < r.to);
}
