import { useMemo } from 'react';
import { PLACES } from '../data/places';
import { ORIGIN } from '../data/categories';
import { withOrigin } from '../domain/geo';
import type { Place } from '../domain/schema';
import { useOrigin } from './originStore';

/** All places with distance and walking time from the chosen starting point, nearest first. */
export function usePlaces(): Place[] {
  const lat = useOrigin((s) => s.origin.lat);
  const lon = useOrigin((s) => s.origin.lon);
  return useMemo(() => withOrigin(PLACES, { lat, lon }, ORIGIN), [lat, lon]);
}

export function usePlace(id: string | undefined): Place | undefined {
  const places = usePlaces();
  return useMemo(() => (id ? places.find((p) => p.id === id) : undefined), [places, id]);
}
