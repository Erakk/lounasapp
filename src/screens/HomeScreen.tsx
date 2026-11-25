import { useCallback, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { CategoryGrid } from '../components/CategoryGrid';
import { FilterBar } from '../components/FilterBar';
import { FilterSheet } from '../components/FilterSheet';
import { PlaceCard } from '../components/PlaceCard';
import { countByCategory } from '../data/places';
import { usePlaces } from '../state/usePlaces';
import { useOrigin } from '../state/originStore';
import { useOriginSheet } from '../state/originSheetStore';
import { activeFilterCount, filterPlaces, widerArea, type SortKey } from '../domain/filters';
import { isOpenForLunch } from '../domain/openingHours';
import { selectFilters, useFilters } from '../state/filterStore';
import { fi } from '../i18n/fi';
import { useAllStats } from '../db/hooks';

const SORTS: SortKey[] = ['distance', 'price', 'rating', 'stale', 'name'];

export function HomeScreen() {
  const filters = useFilters(useShallow(selectFilters));
  const { set, toggleCategory, reset } = useFilters(
    useShallow((s) => ({ set: s.set, toggleCategory: s.toggleCategory, reset: s.reset })),
  );
  const [sheetOpen, setSheetOpen] = useState(false);
  const closeSheet = useCallback(() => setSheetOpen(false), []);

  const places = usePlaces();
  const originName = useOrigin((s) => s.origin.name);
  const showOriginSheet = useOriginSheet((s) => s.show);
  const now = useMemo(() => new Date(), []);
  const stats = useAllStats();
  // "N auki nyt" counts the chosen area only, like the list.
  const area = filters.maxDistanceM;
  const openCount = useMemo(
    () => places.filter((p) => (area === null || p.distanceM <= area) && isOpenForLunch(p.lunchHours, now)).length,
    [places, area, now],
  );
  const wider = widerArea(area);

  // Category tile counts reflect the other filters, so the numbers match what you'd get by tapping.
  const counts = useMemo(() => countByCategory(filterPlaces(places, { ...filters, categories: [] }, now, stats)), [places, filters, now, stats]);
  const results = useMemo(() => filterPlaces(places, filters, now, stats), [places, filters, now, stats]);
  const filterCount = activeFilterCount(filters);
  const anyActive = filterCount > 0 || filters.categories.length > 0;

  const dateLabel = now.toLocaleDateString('fi-FI', { weekday: 'short', day: 'numeric', month: 'numeric' });

  return (
    <div className="pb-4">
      <header className="flex items-center justify-between px-4 pt-6">
        <div>
          <h1 className="font-display text-[26px] font-bold tracking-tight">
            {fi.appName}
            <span className="text-accent-text">.</span>
          </h1>
          <p className="mt-0.5 text-[13px] text-ink-2">
            {dateLabel} · {openCount ? fi.home.openNow(openCount) : fi.home.noneOpen}
          </p>
          <button
            type="button"
            onClick={showOriginSheet}
            aria-label={`${fi.origin.change}, nyt ${originName}, ${fi.filters.areaLabel(area)}`}
            className="-ml-1 mt-1 inline-flex min-h-8 max-w-[60vw] items-center gap-1 rounded-full px-1 text-[13px] font-bold text-ink"
          >
            <span className="truncate">{fi.origin.from(originName, fi.filters.areaLabel(area))}</span>
            <span aria-hidden className="text-ink-3">▾</span>
          </button>
        </div>
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          aria-label={filterCount ? `${fi.filters.title} (${filterCount} käytössä)` : fi.filters.title}
          className={`relative inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-bold ${
            filterCount ? 'border-ink bg-ink text-bg' : 'border-line bg-surface text-ink'
          }`}
        >
          <span aria-hidden>⚙️</span> {fi.filters.title}
          {filterCount > 0 && (
            <span aria-hidden className="absolute -top-1.5 -right-1 grid size-5 place-items-center rounded-full bg-accent text-[11px] text-white">
              {filterCount}
            </span>
          )}
        </button>
      </header>

      <div className="sticky top-0 z-10 bg-bg/95 px-4 pt-3 pb-2 backdrop-blur">
        <FilterBar />
      </div>

      <section className="mt-3 px-4">
        <div className="mb-2.5 flex items-baseline justify-between">
          <h2 className="text-base font-extrabold">{fi.home.question}</h2>
          {anyActive && (
            <button type="button" onClick={reset} className="text-[13px] font-bold text-accent-text">
              {fi.filters.reset}
            </button>
          )}
        </div>
        <CategoryGrid counts={counts} selected={filters.categories} onToggle={toggleCategory} />
      </section>

      <section className="mt-6 px-4" aria-live="polite">
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="text-base font-extrabold">{fi.home.results(results.length)}</h2>
          <label className="flex items-center gap-1 text-xs font-semibold text-ink-2">
            <span>{fi.filters.sortLabel}:</span>
            <select
              value={filters.sort}
              onChange={(e) => set({ sort: e.target.value as SortKey })}
              className="rounded-lg bg-transparent py-1 font-bold text-ink focus-visible:outline-2 focus-visible:outline-accent"
            >
              {SORTS.map((s) => (
                <option key={s} value={s}>
                  {fi.filters.sort[s]}
                </option>
              ))}
            </select>
          </label>
        </div>

        {results.length === 0 ? (
          <div className="rounded-[var(--radius-card)] bg-surface p-6 text-center shadow-card">
            <div aria-hidden className="text-4xl">
              🤷
            </div>
            <p className="mt-2 font-bold">{fi.filters.empty}</p>
            <p className="mt-1 text-sm text-ink-2">{area !== null ? fi.filters.emptyArea(fi.filters.areaLabel(area)) : fi.filters.emptyHint}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {area !== null && (
                <button type="button" onClick={() => set({ maxDistanceM: wider })} className="rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-accent-ink">
                  {fi.filters.widenArea(fi.filters.areaLabel(wider))}
                </button>
              )}
              {anyActive && (
                <button type="button" onClick={reset} className="rounded-xl bg-ink px-4 py-2.5 text-sm font-bold text-bg">
                  {fi.filters.reset}
                </button>
              )}
            </div>
          </div>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {results.map((p) => (
              <li key={p.id}>
                <PlaceCard place={p} now={now} stats={stats.get(p.id)} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <FilterSheet open={sheetOpen} resultCount={results.length} onClose={closeSheet} />
    </div>
  );
}
