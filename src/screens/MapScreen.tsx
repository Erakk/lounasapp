import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import maplibregl, { type Map as MlMap, type Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useShallow } from 'zustand/react/shallow';
import { PLACES } from '../data/places';
import { CATEGORIES, CLUSTERS, ORIGIN, tileBg } from '../data/categories';
import { activeFilterCount, filterPlaces } from '../domain/filters';
import { circlePolygon, groupSpots, radiusForWalk, type MapSpot } from '../domain/geo';
import { useAllStats } from '../db/hooks';
import { selectFilters, useFilters } from '../state/filterStore';
import { PlaceCard } from '../components/PlaceCard';
import { fi } from '../i18n/fi';

// Free vector tiles, no API key (https://openfreemap.org). Data © OpenStreetMap contributors.
const STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';
const RING_MINUTES = [5, 10, 15] as const;

export default function MapScreen() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap>();
  const markersRef = useRef<Marker[]>([]);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string>();
  const [params, setParams] = useSearchParams();

  const filters = useFilters(useShallow(selectFilters));
  const stats = useAllStats();
  const now = useMemo(() => new Date(), []);
  const visible = useMemo(() => filterPlaces(PLACES, filters, now, stats), [filters, now, stats]);
  const spots = useMemo(() => groupSpots(visible), [visible]);
  const selected = spots.find((s) => s.key === selectedKey);
  const filtersOn = activeFilterCount(filters) + filters.categories.length;

  // ── Create the map once ──
  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: [ORIGIN.lon, ORIGIN.lat],
      zoom: 14.2,
      minZoom: 11,
      maxZoom: 19,
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false,
    });
    map.touchZoomRotate.disableRotation();
    mapRef.current = map;

    map.on('load', () => {
      addWalkingRings(map);
      setReady(true);
    });
    map.on('error', (e) => {
      // Tile/style network failures: show a message only if the map never finished loading.
      if (!map.loaded()) setFailed(true);
      console.warn('[map]', e.error?.message);
    });

    // Home marker: Kehräsaari.
    const home = document.createElement('div');
    home.className = 'grid size-11 place-items-center rounded-full border-[3px] border-white bg-accent text-xl shadow-lg';
    home.textContent = '🏠';
    home.title = fi.map.home;
    home.setAttribute('aria-label', fi.map.home);
    new maplibregl.Marker({ element: home }).setLngLat([ORIGIN.lon, ORIGIN.lat]).addTo(map);

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = undefined;
    };
  }, []);

  // ── (Re)draw place markers only when the filtered set changes ──
  const markerByKey = useRef(new Map<string, HTMLElement>());
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((m) => m.remove());
    markerByKey.current.clear();
    markersRef.current = spots.map((spot) => {
      const el = markerElement(spot, () => select(spot));
      const marker = new maplibregl.Marker({ element: el }).setLngLat([spot.lon, spot.lat]).addTo(map);
      // MapLibre replaces aria-label with a generic "Map marker"; restore the place name for screen readers.
      el.setAttribute('aria-label', el.title);
      markerByKey.current.set(spot.key, el);
      return marker;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spots]);

  // ── Selection only toggles a flag on the existing pins, so nothing is rebuilt or moved ──
  useEffect(() => {
    for (const [key, el] of markerByKey.current) {
      const on = key === selectedKey;
      el.dataset.selected = on ? 'true' : 'false';
      el.style.zIndex = on ? '2' : '';
    }
  }, [selectedKey, spots]);

  // ── Deep link: /kartta?paikka=<id> centres on that place and opens its card ──
  useEffect(() => {
    const id = params.get('paikka');
    if (!id || !mapRef.current) return;
    const spot = groupSpots(PLACES).find((s) => s.places.some((p) => p.id === id));
    if (spot) {
      // Make sure the place is visible even if current filters would hide it.
      if (!spots.some((s) => s.key === spot.key)) setSelectedKey(undefined);
      select(spot);
    }
    setParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, ready]);

  function select(spot: MapSpot) {
    setSelectedKey(spot.key);
    mapRef.current?.easeTo({ center: [spot.lon, spot.lat], zoom: Math.max(mapRef.current.getZoom(), 15.5), offset: [0, -120], duration: 500 });
  }

  const recenter = () => mapRef.current?.easeTo({ center: [ORIGIN.lon, ORIGIN.lat], zoom: 14.2, duration: 500 });

  // Places to list in the sheet: from the deep link even if filtered out, else from the visible set.
  const sheetPlaces = selected?.places ?? (selectedKey ? groupSpots(PLACES).find((s) => s.key === selectedKey)?.places : undefined);
  const sheetTitle = selectedKey?.startsWith('cluster:')
    ? CLUSTERS[selectedKey.slice(8) as keyof typeof CLUSTERS].name
    : sheetPlaces && sheetPlaces.length > 1
      ? sheetPlaces[0]!.address.replace(', Tampere', '')
      : undefined;

  return (
    <div className="fixed inset-x-0 top-0 bottom-[calc(74px+env(safe-area-inset-bottom))] mx-auto max-w-[480px]">
      {/* MapLibre's CSS sets the map element to position:relative, so size it via a wrapper. */}
      <div className="absolute inset-0">
        <div ref={containerRef} className="map-canvas h-full w-full" />
      </div>

      {!ready && !failed && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center bg-bg text-sm font-semibold text-ink-2">{fi.map.loading}</div>
      )}
      {failed && <div className="absolute inset-0 grid place-items-center bg-bg p-8 text-center text-sm text-ink-2">{fi.map.error}</div>}

      {/* Top overlay: count + filters link + recenter */}
      <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-2">
        <Link
          to="/"
          className="pointer-events-auto flex items-center gap-2 rounded-full bg-surface/95 px-3.5 py-2 text-[13px] font-bold shadow-card backdrop-blur"
        >
          {fi.map.count(visible.length)}
          <span className={`rounded-full px-2 py-0.5 text-[11px] ${filtersOn ? 'bg-ink text-bg' : 'bg-bg text-ink-2'}`}>
            ⚙️ {fi.map.filters}
            {filtersOn ? ` (${filtersOn})` : ''}
          </span>
        </Link>
        <button
          type="button"
          onClick={recenter}
          className="pointer-events-auto rounded-full bg-surface/95 px-3.5 py-2 text-[13px] font-bold shadow-card backdrop-blur"
        >
          🏠 {fi.map.recenter}
        </button>
      </div>

      {/* Legend for the walking rings */}
      {!selectedKey && (
        <div className="pointer-events-none absolute top-[60px] left-3 rounded-xl bg-surface/90 px-3 py-1.5 text-[11px] font-semibold text-ink-2 shadow-card">
          {fi.map.rings}: {RING_MINUTES.map((m) => `${m}`).join(' / ')} min
        </div>
      )}

      {/* Bottom sheet with the place(s) at the selected marker */}
      {sheetPlaces && (
        <div className="absolute inset-x-0 bottom-0 z-10 max-h-[55%] overflow-y-auto rounded-t-[24px] bg-bg px-3 pt-2 pb-3 shadow-[0_-8px_24px_rgb(0_0_0/.15)]">
          <div className="sticky top-0 z-10 -mx-3 flex items-center justify-between bg-bg px-4 pt-1 pb-2">
            <div className="text-sm font-extrabold">
              {sheetTitle ?? ''}
              {sheetPlaces.length > 1 && <span className="ml-1.5 font-semibold text-ink-3">{fi.map.placesHere(sheetPlaces.length)}</span>}
            </div>
            <button
              type="button"
              onClick={() => setSelectedKey(undefined)}
              aria-label={fi.map.close}
              className="grid size-9 place-items-center rounded-full bg-surface text-ink-2 shadow-card"
            >
              ✕
            </button>
          </div>
          <ul className="flex flex-col gap-2">
            {sheetPlaces.map((p) => (
              <li key={p.id}>
                <PlaceCard place={p} now={now} stats={stats.get(p.id)} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function addWalkingRings(map: MlMap) {
  map.addSource('walk-rings', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: RING_MINUTES.map((m) => ({
        type: 'Feature',
        properties: { minutes: m },
        geometry: { type: 'LineString', coordinates: circlePolygon(ORIGIN, radiusForWalk(m)) },
      })),
    },
  });
  map.addLayer({
    id: 'walk-rings',
    type: 'line',
    source: 'walk-rings',
    paint: { 'line-color': '#C8364A', 'line-width': 1.5, 'line-opacity': 0.55, 'line-dasharray': [2, 2] },
  });
  map.addSource('walk-ring-labels', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: RING_MINUTES.map((m) => {
        const top = circlePolygon(ORIGIN, radiusForWalk(m), 4)[0]!; // northernmost point
        return { type: 'Feature', properties: { label: `${m} min` }, geometry: { type: 'Point', coordinates: top } };
      }),
    },
  });
  map.addLayer({
    id: 'walk-ring-labels',
    type: 'symbol',
    source: 'walk-ring-labels',
    layout: { 'text-field': ['get', 'label'], 'text-size': 12, 'text-font': ['Noto Sans Bold'] },
    paint: { 'text-color': '#C8364A', 'text-halo-color': '#ffffff', 'text-halo-width': 2 },
  });
}

/**
 * Round marker: category emoji (🏬 for clusters), with a count badge when several places share it.
 *
 * The outer element belongs to MapLibre: it positions it with an inline `transform`, so the outer
 * element must have a fixed size and no transform/transition of its own (otherwise the pin slides
 * or shifts when it changes). All visual changes happen on the inner circle, which scales from its
 * own centre when the pin is selected (data-selected="true", see .map-pin in index.css).
 */
function markerElement(spot: MapSpot, onClick: () => void): HTMLElement {
  const first = spot.places[0]!;
  const cat = CATEGORIES.find((c) => c.id === first.categories[0])!;
  const el = document.createElement('button');
  el.type = 'button';
  const label = spot.clusterId ? CLUSTERS[spot.clusterId].name : spot.places.map((p) => p.name).join(', ');
  el.setAttribute('aria-label', label);
  el.title = label;
  el.className = 'map-pin size-10 p-0';
  el.dataset.selected = 'false';

  const circle = document.createElement('span');
  circle.className = 'map-pin-circle relative grid size-10 place-items-center rounded-full border-2 border-white text-xl shadow-md';
  circle.style.background = spot.clusterId ? '#E6E6F2' : tileBg(cat.tile);
  circle.textContent = spot.clusterId ? '🏬' : cat.emoji;
  if (spot.places.length > 1) {
    const badge = document.createElement('span');
    badge.className = 'absolute -top-1.5 -right-1.5 grid min-w-5 place-items-center rounded-full bg-ink px-1 text-[11px] font-bold text-bg';
    badge.textContent = String(spot.places.length);
    circle.appendChild(badge);
  }
  el.appendChild(circle);

  el.addEventListener('click', (e) => {
    e.stopPropagation();
    onClick();
  });
  return el;
}
