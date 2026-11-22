import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LounasDB } from './db';
import { addNote, addVisit, clearAll, deleteNote, exportAll, importBackup, parseBackup, removeVisit, setFavourite, setHidden, updateNote } from './repo';
import { buildStats, daysSince, relativeDay } from '../domain/stats';

let d: LounasDB;
beforeEach(() => {
  d = new LounasDB(`test-${Math.random()}`);
});
afterEach(async () => {
  await d.delete();
});

const stats = async () => buildStats(await d.visits.toArray(), await d.notes.toArray(), await d.prefs.toArray());

describe('visits', () => {
  it('counts visits and remembers the latest date', async () => {
    await addVisit('malika', 5, new Date(2026, 10, 10), d);
    await addVisit('malika', undefined, new Date(2026, 10, 20), d);
    await addVisit('biang', 3, new Date(2026, 10, 15), d);
    const s = (await stats()).get('malika')!;
    expect(s.visitCount).toBe(2);
    expect(s.lastVisited).toBe(new Date(2026, 10, 20).toISOString());
  });

  it('undo removes exactly the visit that was added', async () => {
    await addVisit('malika', 5, new Date(2026, 10, 10), d);
    const v = await addVisit('malika', 5, new Date(2026, 10, 11), d);
    await removeVisit(v.id, d);
    expect((await stats()).get('malika')!.visitCount).toBe(1);
  });
});

describe('notes', () => {
  it('adds, edits and deletes notes; averages stars', async () => {
    const a = await addNote('malika', { text: '  Hyvä curry  ', stars: 5, tags: ['Hyvä hinta'] }, d);
    await addNote('malika', { text: 'Jonoa', stars: 3, tags: [] }, d);
    expect((await d.notes.get(a.id))!.text).toBe('Hyvä curry');
    expect((await stats()).get('malika')!.avgStars).toBe(4);

    await updateNote(a.id, { text: 'Paras curry', stars: 4, tags: [] }, d);
    const edited = (await d.notes.get(a.id))!;
    expect(edited.text).toBe('Paras curry');
    expect(edited.updated).toBeDefined();

    await deleteNote(a.id, d);
    expect((await stats()).get('malika')!.noteCount).toBe(1);
  });
});

describe('prefs', () => {
  it('keeps favourite and hidden independent', async () => {
    await setFavourite('malika', true, d);
    await setHidden('malika', true, d);
    await setFavourite('malika', false, d);
    const s = (await stats()).get('malika')!;
    expect(s.favourite).toBe(false);
    expect(s.hidden).toBe(true);
  });
});

describe('backup', () => {
  it('round-trips through export → JSON → import', async () => {
    await addVisit('malika', 5, new Date(2026, 10, 10), d);
    await addNote('malika', { text: 'Hyvä', stars: 5, tags: [] }, d);
    await setFavourite('biang', true, d);
    const json = JSON.stringify(await exportAll(d));

    await clearAll(d);
    expect(await d.visits.count()).toBe(0);

    const counts = await importBackup(parseBackup(json), d);
    expect(counts).toEqual({ visits: 1, notes: 1, prefs: 1 });
    // Importing twice doesn't duplicate (same ids are overwritten).
    await importBackup(parseBackup(json), d);
    expect(await d.visits.count()).toBe(1);
  });

  it('rejects files that are not backups', () => {
    expect(() => parseBackup('not json')).toThrow(/JSON/);
    expect(() => parseBackup('{"app":"other"}')).toThrow(/varmuuskopio/);
    expect(() =>
      parseBackup(JSON.stringify({ app: 'lounasapp', version: 1, visits: [{ id: 1 }], notes: [], prefs: [] })),
    ).toThrow(/virheellisiä/);
  });
});

describe('relative dates', () => {
  const now = new Date(2026, 10, 22, 12);
  it('formats days and weeks', () => {
    expect(daysSince(new Date(2026, 10, 22, 8).toISOString(), now)).toBe(0);
    expect(relativeDay(new Date(2026, 10, 21).toISOString(), now)).toBe('eilen');
    expect(relativeDay(new Date(2026, 10, 17).toISOString(), now)).toBe('5 pv sitten');
    expect(relativeDay(new Date(2026, 10, 1).toISOString(), now)).toBe('3 vk sitten');
  });
});
