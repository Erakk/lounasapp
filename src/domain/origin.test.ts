import { describe, expect, it } from 'vitest';
import { PLACES } from '../data/places';
import { ORIGIN } from '../data/categories';
import { haversineM, walkMinFor, withOrigin } from './geo';
import { isInTampere } from './tampere';
import { toResults } from './geocode';
import { ORIGIN_PRESETS, useOrigin } from '../state/originStore';

describe('isInTampere', () => {
  it.each([
    ['Kehräsaari', 61.4955657, 23.7636643],
    ['Hervanta', 61.4497, 23.8573],
    ['Lielahti', 61.5167, 23.6753],
    ['Teisko', 61.68, 23.85],
  ])('%s is inside', (_n, lat, lon) => expect(isInTampere(lat, lon)).toBe(true));

  it.each([
    ['Pirkkala centre', 61.4642, 23.6461],
    ['Nokia', 61.4789, 23.5094],
    ['Kangasala', 61.4636, 24.0656],
    ['Ylöjärvi centre', 61.5503, 23.5964],
    ['Lempäälä', 61.3139, 23.7531],
    ['Helsinki', 60.1699, 24.9384],
  ])('%s is outside', (_n, lat, lon) => expect(isInTampere(lat, lon)).toBe(false));

  it('all presets and all places are inside', () => {
    for (const o of ORIGIN_PRESETS) expect(isInTampere(o.lat, o.lon), o.name).toBe(true);
    for (const p of PLACES) expect(isInTampere(p.lat, p.lon), p.name).toBe(true);
  });
});

describe('withOrigin', () => {
  it('keeps the prebuilt data as is for Kehräsaari', () => {
    expect(withOrigin(PLACES, ORIGIN, ORIGIN)).toBe(PLACES);
  });

  it('matches the build-time distances when recomputed from Kehräsaari', () => {
    const again = withOrigin(PLACES, { lat: ORIGIN.lat, lon: ORIGIN.lon });
    for (const p of again) {
      const orig = PLACES.find((x) => x.id === p.id)!;
      expect(p.distanceM).toBe(orig.distanceM);
      expect(p.walkMin).toBe(orig.walkMin);
    }
  });

  it('re-measures and re-sorts from another point', () => {
    const station = ORIGIN_PRESETS.find((o) => o.id === 'rautatieasema')!;
    const list = withOrigin(PLACES, station, ORIGIN);
    expect(list).toHaveLength(PLACES.length);
    for (let i = 1; i < list.length; i++) expect(list[i]!.distanceM).toBeGreaterThanOrEqual(list[i - 1]!.distanceM);
    const p = list[0]!;
    expect(p.distanceM).toBe(Math.round(haversineM(station, p)));
    expect(p.walkMin).toBe(walkMinFor(p.distanceM));
    // The original array is not mutated.
    expect(PLACES[0]!.distanceM).toBeLessThanOrEqual(PLACES[1]!.distanceM);
    expect(list[0]!.id).not.toBe(PLACES[0]!.id);
  });

  it('never reports less than 1 minute', () => {
    expect(walkMinFor(0)).toBe(1);
    expect(walkMinFor(615)).toBe(10);
  });
});

describe('origin store', () => {
  it('refuses points outside Tampere', () => {
    const before = useOrigin.getState().origin;
    expect(useOrigin.getState().setOrigin({ id: 'x', name: 'Nokia', lat: 61.4789, lon: 23.5094, kind: 'map' })).toBe(false);
    expect(useOrigin.getState().origin).toBe(before);
  });

  it('sets a point inside Tampere and remembers own picks, not presets', () => {
    const s = useOrigin.getState();
    expect(s.setOrigin({ id: 'map', name: 'Valittu kartalta', lat: 61.4991, lon: 23.7612, kind: 'map' })).toBe(true);
    expect(useOrigin.getState().origin.name).toBe('Valittu kartalta');
    expect(useOrigin.getState().recent).toHaveLength(1);
    s.setOrigin(ORIGIN_PRESETS[1]!);
    expect(useOrigin.getState().origin.id).toBe('keskustori');
    expect(useOrigin.getState().recent).toHaveLength(1);
    useOrigin.getState().reset();
    expect(useOrigin.getState().origin.id).toBe('kehrasaari');
  });
});

describe('geocode results', () => {
  it('keeps Tampere hits only and builds readable names', () => {
    const rows = [
      { osm_type: 'way', osm_id: 1, lat: '61.4977', lon: '23.7609', name: '', display_name: 'Hämeenkatu 10, Keskusta, Tampere', address: { road: 'Hämeenkatu', house_number: '10', suburb: 'Keskusta' } },
      { osm_type: 'node', osm_id: 2, lat: '61.5038', lon: '23.7753', name: 'Tampere-talo', display_name: 'Tampere-talo, Yliopistonkatu 55, Tampere', address: { road: 'Yliopistonkatu', house_number: '55', suburb: 'Kalevanrinne' } },
      { osm_type: 'node', osm_id: 3, lat: '61.4789', lon: '23.5094', name: 'Nokia', display_name: 'Nokia', address: {} },
    ];
    const out = toResults(rows);
    expect(out.map((r) => r.name)).toEqual(['Hämeenkatu 10', 'Tampere-talo']);
    expect(out[0]!.detail).toBe('Keskusta');
    expect(out[1]!.detail).toBe('Yliopistonkatu 55, Kalevanrinne');
  });

  it('collapses shops at the same address when searching for an address', () => {
    const shop = (id: number, name: string) => ({
      osm_type: 'node', osm_id: id, lat: '61.4977', lon: '23.7609', name, display_name: name,
      address: { road: 'Hämeenkatu', house_number: '10', suburb: 'Kyttälä' },
    });
    const out = toResults([shop(1, 'Cybershop'), shop(2, 'Jaltra Bar')], 'Hämeenkatu 10');
    expect(out).toEqual([{ id: 'node:1', name: 'Hämeenkatu 10', detail: 'Kyttälä', lat: 61.4977, lon: 23.7609 }]);
  });
});
