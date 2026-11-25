import { TAMPERE_BBOX, isInTampere } from './tampere';

export interface GeoResult {
  id: string;
  name: string;
  detail: string;
  lat: number;
  lon: number;
}

export interface NominatimRow {
  osm_type: string;
  osm_id: number;
  lat: string;
  lon: string;
  name?: string;
  display_name: string;
  address?: Record<string, string | undefined>;
}

/**
 * Address / place search limited to Tampere, via OpenStreetMap Nominatim
 * (https://nominatim.org, free, max ~1 request/s — we only search on submit).
 * Results outside the city boundary are dropped.
 */
export async function searchTampere(query: string, signal?: AbortSignal): Promise<GeoResult[]> {
  const [w, s, e, n] = TAMPERE_BBOX;
  const params = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    addressdetails: '1',
    countrycodes: 'fi',
    viewbox: `${w},${n},${e},${s}`,
    bounded: '1',
    limit: '10',
    'accept-language': 'fi',
  });
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return toResults((await res.json()) as NominatimRow[], query);
}

/**
 * Readable, de-duplicated results inside Tampere. When the query has a house number
 * ("Hämeenkatu 10") the address itself is the answer, so shops at that address collapse into one row.
 */
export function toResults(rows: NominatimRow[], query = ''): GeoResult[] {
  const addressQuery = /\d/.test(query);
  const seen = new Set<string>();
  const out: GeoResult[] = [];
  for (const r of rows) {
    const lat = Number(r.lat);
    const lon = Number(r.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || !isInTampere(lat, lon)) continue;
    const a = r.address ?? {};
    const street = [a.road ?? a.pedestrian ?? a.footway, a.house_number].filter(Boolean).join(' ');
    const name = (addressQuery && a.house_number && street) || r.name || street || r.display_name.split(',')[0]!.trim();
    const area = a.suburb ?? a.quarter ?? a.neighbourhood ?? a.city_district;
    const detail = [street && street !== name ? street : '', area].filter(Boolean).join(', ');
    const key = `${name}|${detail}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ id: `${r.osm_type}:${r.osm_id}`, name, detail, lat, lon });
  }
  return out;
}
