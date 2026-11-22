import { useCallback, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { CategoryGrid } from '../components/CategoryGrid';
import { FilterBar } from '../components/FilterBar';
import { FilterSheet } from '../components/FilterSheet';
import { PlaceCard } from '../components/PlaceCard';
import { PLACES, countByCategory } from '../data/places';
import { activeFilterCount, filterPlaces, type SortKey } from '../domain/filters';
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

  const now = useMemo(() => new Date(), []);
  const stats = useAllStats();
  const openCount = useMemo(() => PLACES.filter((p) => isOpenForLunch(p.lunchHours, now)).length, [now]);

  // Category tile counts reflect the other filters, so the numbers match what you'd get by tapping.
  const counts = useMemo(() => countByCategory(filterPlaces(PLACES, { ...filters, categories: [] }, now, stats)), [filters, now, stats]);
  const results = useMemo(() => filterPlaces(PLACES, filters, now, stats), [filters, now, stats]);
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
            <p className="mt-1 text-sm text-ink-2">{fi.filters.emptyHint}</p>
            <button type="button" onClick={reset} className="mt-4 rounded-xl bg-ink px-4 py-2.5 text-sm font-bold text-bg">
              {fi.filters.reset}
            </button>
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
