import { describe, expect, it } from 'vitest';
import { isOpenForLunch, parseHours, weekdayOf } from './openingHours';
import { priceLabel } from './format';
import { PLACES, inCategory } from '../data/places';

describe('parseHours', () => {
  it('parses ranges, lists and short times', () => {
    expect(parseHours('mon 11-14; wed-fri 10:30-15')).toEqual({
      mon: [{ from: '11:00', to: '14:00' }],
      wed: [{ from: '10:30', to: '15:00' }],
      thu: [{ from: '10:30', to: '15:00' }],
      fri: [{ from: '10:30', to: '15:00' }],
    });
  });
  it('supports daily and multiple ranges per day', () => {
    const h = parseHours('daily 10:30-14, 16-20');
    expect(Object.keys(h)).toHaveLength(7);
    expect(h.sun).toHaveLength(2);
  });
  it('rejects nonsense', () => {
    expect(() => parseHours('mo-fr 11-14')).toThrow();
    expect(() => parseHours('mon eleven')).toThrow();
  });
});

describe('isOpenForLunch', () => {
  const h = parseHours('mon 11-14; wed-fri 11-14');
  it('is open inside the range and closed at the end minute', () => {
    expect(isOpenForLunch(h, new Date(2026, 10, 23, 12, 0))).toBe(true); // Mon
    expect(isOpenForLunch(h, new Date(2026, 10, 23, 14, 0))).toBe(false);
    expect(isOpenForLunch(h, new Date(2026, 10, 23, 10, 59))).toBe(false);
  });
  it('is closed on days without lunch', () => {
    expect(isOpenForLunch(h, new Date(2026, 10, 24, 12, 0))).toBe(false); // Tue
  });
  it('maps JS Sunday correctly', () => {
    expect(weekdayOf(new Date(2026, 10, 22))).toBe('sun');
  });
});

describe('place data', () => {
  it('has places sorted by distance', () => {
    const d = PLACES.map((p) => p.distanceM);
    expect([...d].sort((a, b) => a - b)).toEqual(d);
  });
  it('treats aasia as an umbrella category', () => {
    const noodle = PLACES.find((p) => p.id === 'noodle-master')!;
    expect(inCategory(noodle, 'aasia')).toBe(true);
    expect(inCategory(noodle, 'intia')).toBe(false);
  });
  it('formats prices', () => {
    expect(priceLabel(PLACES.find((p) => p.id === 'ravintola-malika')!)).toBe('10,90–13,90 €');
    expect(priceLabel(PLACES.find((p) => p.id === 'gopal')!)).toBe('2,55 €/100 g');
  });
});
