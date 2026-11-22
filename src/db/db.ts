import Dexie, { type EntityTable } from 'dexie';

/** One "Kävimme täällä" tap. */
export interface Visit {
  id: string;
  placeId: string;
  /** ISO timestamp. */
  date: string;
  groupSize?: number;
}

/** A personal note / mini review. */
export interface Note {
  id: string;
  placeId: string;
  /** ISO timestamp of creation. */
  date: string;
  updated?: string;
  text: string;
  stars?: 1 | 2 | 3 | 4 | 5;
  tags: string[];
}

/** Per-place personal flags. Missing row = defaults (not favourite, not hidden). */
export interface PlacePref {
  placeId: string;
  favourite?: boolean;
  hidden?: boolean;
}

/**
 * Personal data lives only on this phone (decision D1). Ids are UUIDs and dates ISO strings
 * so the same records can later be synced to a shared backend without migration.
 */
export class LounasDB extends Dexie {
  visits!: EntityTable<Visit, 'id'>;
  notes!: EntityTable<Note, 'id'>;
  prefs!: EntityTable<PlacePref, 'placeId'>;

  constructor(name = 'lounas') {
    super(name);
    this.version(1).stores({
      visits: 'id, placeId, date',
      notes: 'id, placeId, date',
      prefs: 'placeId',
    });
  }
}

export const db = new LounasDB();

/** Ask the browser not to evict our data under storage pressure (best effort, once). */
let persistAsked = false;
export async function requestPersistence(): Promise<void> {
  if (persistAsked) return;
  persistAsked = true;
  try {
    await navigator.storage?.persist?.();
  } catch {
    /* not supported – fine */
  }
}

export const newId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
