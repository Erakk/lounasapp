import { db, newId, requestPersistence, type LounasDB, type Note, type PlacePref, type Visit } from './db';

// ── Visits ──────────────────────────────────────────────

export async function addVisit(placeId: string, groupSize?: number, date = new Date(), d: LounasDB = db): Promise<Visit> {
  void requestPersistence();
  const v: Visit = { id: newId(), placeId, date: date.toISOString(), ...(groupSize ? { groupSize } : {}) };
  await d.visits.add(v);
  return v;
}

export const removeVisit = (id: string, d: LounasDB = db) => d.visits.delete(id);

// ── Notes ───────────────────────────────────────────────

export async function addNote(
  placeId: string,
  input: Pick<Note, 'text' | 'stars' | 'tags'>,
  d: LounasDB = db,
): Promise<Note> {
  void requestPersistence();
  const n: Note = { id: newId(), placeId, date: new Date().toISOString(), text: input.text.trim(), tags: input.tags, ...(input.stars ? { stars: input.stars } : {}) };
  await d.notes.add(n);
  return n;
}

export async function updateNote(id: string, input: Pick<Note, 'text' | 'stars' | 'tags'>, d: LounasDB = db) {
  await d.notes.update(id, { text: input.text.trim(), stars: input.stars, tags: input.tags, updated: new Date().toISOString() });
}

export const deleteNote = (id: string, d: LounasDB = db) => d.notes.delete(id);

// ── Favourites / hidden ─────────────────────────────────

async function setPref(placeId: string, patch: Omit<PlacePref, 'placeId'>, d: LounasDB) {
  const current = (await d.prefs.get(placeId)) ?? { placeId };
  await d.prefs.put({ ...current, ...patch });
}

export const setFavourite = (placeId: string, favourite: boolean, d: LounasDB = db) => setPref(placeId, { favourite }, d);
export const setHidden = (placeId: string, hidden: boolean, d: LounasDB = db) => setPref(placeId, { hidden }, d);

// ── Backup (export / import) ────────────────────────────

export interface Backup {
  app: 'lounasapp';
  version: 1;
  exportedAt: string;
  visits: Visit[];
  notes: Note[];
  prefs: PlacePref[];
}

export async function exportAll(d: LounasDB = db): Promise<Backup> {
  const [visits, notes, prefs] = await Promise.all([d.visits.toArray(), d.notes.toArray(), d.prefs.toArray()]);
  return { app: 'lounasapp', version: 1, exportedAt: new Date().toISOString(), visits, notes, prefs };
}

/** Throws with a Finnish message if the file isn't a valid backup. */
export function parseBackup(text: string): Backup {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Tiedosto ei ole kelvollista JSONia.');
  }
  const b = data as Partial<Backup>;
  if (b?.app !== 'lounasapp' || b.version !== 1 || !Array.isArray(b.visits) || !Array.isArray(b.notes) || !Array.isArray(b.prefs)) {
    throw new Error('Tiedosto ei ole Lounas-sovelluksen varmuuskopio.');
  }
  const okVisit = (v: Visit) => typeof v.id === 'string' && typeof v.placeId === 'string' && !Number.isNaN(Date.parse(v.date));
  const okNote = (n: Note) => typeof n.id === 'string' && typeof n.placeId === 'string' && typeof n.text === 'string' && Array.isArray(n.tags);
  const okPref = (p: PlacePref) => typeof p.placeId === 'string';
  if (!b.visits.every(okVisit) || !b.notes.every(okNote) || !b.prefs.every(okPref)) {
    throw new Error('Varmuuskopiossa on virheellisiä rivejä.');
  }
  return b as Backup;
}

/** Merge: records with the same id are overwritten, everything else is kept. Returns counts. */
export async function importBackup(b: Backup, d: LounasDB = db) {
  await d.transaction('rw', d.visits, d.notes, d.prefs, async () => {
    await d.visits.bulkPut(b.visits);
    await d.notes.bulkPut(b.notes);
    await d.prefs.bulkPut(b.prefs);
  });
  return { visits: b.visits.length, notes: b.notes.length, prefs: b.prefs.length };
}

export async function clearAll(d: LounasDB = db) {
  await d.transaction('rw', d.visits, d.notes, d.prefs, async () => {
    await Promise.all([d.visits.clear(), d.notes.clear(), d.prefs.clear()]);
  });
}
