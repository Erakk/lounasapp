import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import maplibregl, { type Map as MlMap, type Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useShallow } from 'zustand/react/shallow';
import { CATEGORIES, CLUSTERS, tileBg } from '../data/categories';
import { filterPlaces } from '../domain/filters';
import { bounds, circlePolygon, groupSpots, radiusForWalk, type MapSpot } from '../domain/geo';
import { useAllStats } from '../db/hooks';
import { usePlaces } from '../state/usePlaces';
import { useOrigin, type Origin } from '../state/originStore';
import { useToast } from '../state/toastStore';
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
  const [picking, setPicking] = useState(false);
  const origin = useOrigin((s) => s.origin);
  const setOrigin = useOrigin((s) => s.setOrigin);
  const showToast = useToast((s) => s.show);
  const originRef = useRef(origin);
  originRef.current = origin;
  const area = useFilters((s) => s.maxDistanceM);
  const areaRef = useRef(area);
  areaRef.current = area;
  const homeRef = useRef<Marker>();
  const places = usePlaces();

  const filters = useFilters(useShallow(selectFilters));
  const stats = useAllStats();
  const now = useMemo(() => new Date(), []);
  const visible = useMemo(() => filterPlaces(places, filters, now, stats), [places, filters, now, stats]);
  const spots = useMemo(() => groupSpots(visible), [visible]);
  const selected = spots.find((s) => s.key === selectedKey);

  // ── Create the map once ──
  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: [originRef.current.lon, originRef.current.lat],
      ...areaView(originRef.current, areaRef.current),
      minZoom: 11,
      maxZoom: 19,
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false,
    });
    map.touchZoomRotate.disableRotation();
    mapRef.current = map;

    map.on('load', () => {
      addWalkingRings(map, originRef.current);
      addArea(map, originRef.current, areaRef.current);
      setReady(true);
    });
    map.on('error', (e) => {
      // Tile/style network failures: show a message only if the map never finished loading.
      if (!map.loaded()) setFailed(true);
      console.warn('[map]', e.error?.message);
    });

    // Home marker: the chosen starting point (moved by the effect below when it changes).
    const home = document.createElement('div');
    home.className = 'grid size-11 place-items-center rounded-full border-[3px] border-white bg-accent text-xl shadow-lg';
    home.textContent = '🏠';
    home.style.zIndex = '2'; // above ordinary and cluster pins, below a selected pin (z 3)
    homeRef.current = new maplibregl.Marker({ element: home }).setLngLat([originRef.current.lon, originRef.current.lat]).addTo(map);

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = undefined;
    };
  }, []);

  // ── Starting point changed: move the home marker, rings and area (the view follows in the fit effect below) ──
  useEffect(() => {
    const map = mapRef.current;
    const home = homeRef.current;
    if (!map || !home) return;
    home.setLngLat([origin.lon, origin.lat]);
    const el = home.getElement();
    el.title = fi.map.home(origin.name);
    el.setAttribute('aria-label', fi.map.home(origin.name));
    if (ready) {
      updateWalkingRings(map, origin);
      updateArea(map, origin, areaRef.current);
    }
  }, [origin, ready]);

  // ── Area changed: redraw the shade outside it ──
  useEffect(() => {
    const map = mapRef.current;
    if (map && ready) updateArea(map, originRef.current, area);
  }, [area, ready]);

  // ── A new area or starting point: show the whole area (skipped on first render, the map opens there) ──
  const firstFit = useRef(true);
  useEffect(() => {
    if (!ready) return;
    if (firstFit.current) {
      firstFit.current = false;
      return;
    }
    recenter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [area, origin.lat, origin.lon, ready]);

  // ── Pick mode (/kartta?valitse=1 from the Lähtöpiste sheet): crosshair in the middle, confirm sets the point ──
  useEffect(() => {
    if (params.get('valitse') !== '1') return;
    setSelectedKey(undefined);
    setPicking(true);
    setParams({}, { replace: true });
  }, [params, setParams]);

  function confirmPick() {
    const map = mapRef.current;
    if (!map) return;
    const c = map.getCenter();
    const round = (v: number) => Math.round(v * 1e6) / 1e6;
    const ok = setOrigin({ id: 'map', name: fi.origin.mapPoint, lat: round(c.lat), lon: round(c.lng), kind: 'map' });
    if (!ok) {
      showToast(fi.origin.outside);
      return;
    }
    setPicking(false);
    showToast(fi.origin.set(fi.origin.mapPoint));
  }

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
      el.style.zIndex = on ? '3' : (el.dataset.z ?? '');
    }
  }, [selectedKey, spots]);

  // ── Deep link: /kartta?paikka=<id> centres on that place and opens its card ──
  useEffect(() => {
    const id = params.get('paikka');
    if (!id || !mapRef.current) return;
    const spot = groupSpots(places).find((s) => s.places.some((p) => p.id === id));
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

  const recenter = () => {
    const map = mapRef.current;
    if (!map) return;
    const v = areaView(origin, area);
    if (v.bounds) map.fitBounds(v.bounds, { padding: v.fitBoundsOptions.padding, duration: 500 });
    else map.easeTo({ center: [origin.lon, origin.lat], zoom: v.zoom, duration: 500 });
  };

  // Places to list in the sheet: from the deep link even if filtered out, else from the visible set.
  const sheetPlaces = selected?.places ?? (selectedKey ? groupSpots(places).find((s) => s.key === selectedKey)?.places : undefined);
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

      {/* Top overlay. Row 1: place count, recenter. Row 2: starting point + area and the ring legend (info only; changed in Asetukset). */}
      <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex items-start justify-between gap-2">
        <div className="pointer-events-auto rounded-full bg-surface/95 px-3.5 py-2 text-[13px] font-bold whitespace-nowrap shadow-card backdrop-blur">
          {fi.map.count(visible.length)}
        </div>
        <button
          type="button"
          onClick={recenter}
          aria-label={fi.map.recenter}
          title={fi.map.recenter}
          className="pointer-events-auto grid size-10 shrink-0 place-items-center rounded-full bg-surface/95 text-lg font-bold shadow-card backdrop-blur"
        >
          ◎
        </button>
      </div>
      {!picking && (
        <div className="pointer-events-none absolute top-[60px] left-3 z-10 max-w-[calc(100%-24px)] rounded-xl bg-surface/95 px-3 py-1.5 shadow-card backdrop-blur">
          <span className="flex items-center gap-1 text-[13px] font-bold">
            <span className="truncate">
              🏠 {origin.name} · {fi.filters.areaLabel(area)}
            </span>
          </span>
          {!selectedKey && (
            <span className="block text-[11px] font-semibold text-ink-2">
              {fi.map.rings}: {RING_MINUTES.join(' / ')} min
            </span>
          )}
        </div>
      )}

      {/* Pick mode: fixed crosshair in the middle of the map + confirm bar */}
      {picking && (
        <>
          <div aria-hidden className="pointer-events-none absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-full pb-0.5 text-4xl drop-shadow">
            📍
          </div>
          <div className="absolute inset-x-3 bottom-3 z-20 rounded-[20px] bg-surface p-3 shadow-card">
            <p className="text-[13px] font-semibold text-ink-2">{fi.map.pickTitle}</p>
            <div className="mt-2 grid grid-cols-[auto_1fr] gap-2">
              <button type="button" onClick={() => setPicking(false)} className="min-h-11 rounded-xl border border-line px-4 text-sm font-bold">
                {fi.map.pickCancel}
              </button>
              <button type="button" onClick={confirmPick} className="min-h-11 rounded-xl bg-accent px-4 text-sm font-bold text-white">
                {fi.map.pickConfirm}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Bottom sheet with the place(s) at the selected marker */}
      {sheetPlaces && !picking && (
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

function ringLines(o: Origin): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: RING_MINUTES.map((m) => ({
      type: 'Feature',
      properties: { minutes: m },
      geometry: { type: 'LineString', coordinates: circlePolygon(o, radiusForWalk(m)) },
    })),
  };
}

function ringLabels(o: Origin): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: RING_MINUTES.map((m) => {
      const top = circlePolygon(o, radiusForWalk(m), 4)[0]!; // northernmost point
      return { type: 'Feature', properties: { label: `${m} min` }, geometry: { type: 'Point', coordinates: top } };
    }),
  };
}

/** Map view that shows the whole area around the starting point (or a city-wide zoom for "Koko Tampere"). */
function areaView(o: Origin, areaM: number | null) {
  if (areaM === null) return { center: [o.lon, o.lat] as [number, number], zoom: 12 };
  const ring = circlePolygon(o, areaM, 16).map(([lon, lat]) => ({ lat, lon }));
  return { bounds: bounds(ring, 0), fitBoundsOptions: { padding: { top: 110, bottom: 20, left: 12, right: 12 } } };
}

/** Everything outside the area is shaded: a world-sized polygon with the area circle cut out of it. */
function areaMask(o: Origin, areaM: number | null): GeoJSON.FeatureCollection {
  if (areaM === null) return { type: 'FeatureCollection', features: [] };
  const world: [number, number][] = [[-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85]];
  const hole = circlePolygon(o, areaM, 96).reverse();
  return {
    type: 'FeatureCollection',
    features: [
      { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [world, hole] } },
      { type: 'Feature', properties: { edge: true }, geometry: { type: 'LineString', coordinates: hole } },
    ],
  };
}

function addArea(map: MlMap, o: Origin, areaM: number | null) {
  map.addSource('area', { type: 'geojson', data: areaMask(o, areaM) });
  map.addLayer({ id: 'area-shade', type: 'fill', source: 'area', filter: ['==', '$type', 'Polygon'], paint: { 'fill-color': '#1F2421', 'fill-opacity': 0.12 } });
  map.addLayer({ id: 'area-edge', type: 'line', source: 'area', filter: ['==', '$type', 'LineString'], paint: { 'line-color': '#1F2421', 'line-width': 1.5, 'line-opacity': 0.5 } });
}

function updateArea(map: MlMap, o: Origin, areaM: number | null) {
  (map.getSource('area') as maplibregl.GeoJSONSource | undefined)?.setData(areaMask(o, areaM));
}

function updateWalkingRings(map: MlMap, o: Origin) {
  (map.getSource('walk-rings') as maplibregl.GeoJSONSource | undefined)?.setData(ringLines(o));
  (map.getSource('walk-ring-labels') as maplibregl.GeoJSONSource | undefined)?.setData(ringLabels(o));
}

function addWalkingRings(map: MlMap, o: Origin) {
  map.addSource('walk-rings', { type: 'geojson', data: ringLines(o) });
  map.addLayer({
    id: 'walk-rings',
    type: 'line',
    source: 'walk-rings',
    paint: { 'line-color': '#C8364A', 'line-width': 1.5, 'line-opacity': 0.55, 'line-dasharray': [2, 2] },
  });
  map.addSource('walk-ring-labels', { type: 'geojson', data: ringLabels(o) });
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
  // Shopping-centre pins hold many places: keep them above single places when zoomed out.
  if (spot.clusterId) {
    el.dataset.z = '1';
    el.style.zIndex = '1';
  }

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
