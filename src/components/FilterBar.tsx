import { PRICE_OPTIONS, WALK_OPTIONS, activeFilterCount } from '../domain/filters';
import { useFilters, selectFilters } from '../state/filterStore';
import { useShallow } from 'zustand/react/shallow';
import { fi } from '../i18n/fi';

const cycle = <T,>(options: readonly T[], current: T | null): T | null => {
  if (current === null) return options[0]!;
  const i = options.indexOf(current);
  return i < 0 || i === options.length - 1 ? null : options[i + 1]!;
};

/** Horizontal quick-filter chips. Tapping walk/price cycles through values; "Lisää" opens the full sheet. */
export function FilterBar({ onMore }: { onMore: () => void }) {
  const f = useFilters(useShallow(selectFilters));
  const set = useFilters((s) => s.set);
  const extra = activeFilterCount(f) - [f.groupSize, f.maxWalk, f.maxPrice].filter((x) => x !== null).length - (f.openNow ? 1 : 0);

  return (
    // Chips wrap onto a second row on narrow phones, so every filter is visible and tappable (no hidden sideways scroll).
    <div role="toolbar" aria-label={fi.filters.title} className="flex flex-wrap items-center gap-2">
      <GroupChip value={f.groupSize} onChange={(groupSize) => set({ groupSize })} />
      <Chip on={f.maxWalk !== null} onClick={() => set({ maxWalk: cycle(WALK_OPTIONS, f.maxWalk) })}>
        🚶 {f.maxWalk === null ? fi.filters.walk : fi.filters.walkMax(f.maxWalk)}
      </Chip>
      <Chip on={f.maxPrice !== null} onClick={() => set({ maxPrice: cycle(PRICE_OPTIONS, f.maxPrice) })}>
        💶 {f.maxPrice === null ? fi.filters.price : fi.filters.priceMax(f.maxPrice)}
      </Chip>
      <Chip on={f.openNow} tone="sage" onClick={() => set({ openNow: !f.openNow })} pressed={f.openNow}>
        <span aria-hidden className="size-2 rounded-full bg-sage" /> {fi.filters.openNow}
      </Chip>

      <button
        type="button"
        onClick={onMore}
        aria-label={extra > 0 ? `${fi.filters.more} (${extra})` : fi.filters.more}
        className={`relative ml-auto inline-flex min-h-10 flex-none items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-bold ${
          extra > 0 ? 'border-ink bg-ink text-bg' : 'border-line bg-surface text-ink'
        }`}
      >
        <span aria-hidden>⚙️</span> {fi.filters.more}
        {extra > 0 && (
          <span className="absolute -top-1.5 -right-1 grid size-5 place-items-center rounded-full bg-accent text-[11px] text-white">
            {extra}
          </span>
        )}
      </button>
    </div>
  );
}

export function Chip({
  on,
  tone,
  pressed,
  onClick,
  children,
}: {
  on: boolean;
  tone?: 'sage';
  pressed?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const style = on
    ? tone === 'sage'
      ? 'bg-sage-soft border-sage text-ink'
      : 'bg-ink text-bg border-ink'
    : 'bg-surface text-ink border-line';
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`inline-flex min-h-10 flex-none items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-semibold whitespace-nowrap transition-colors ${style}`}
    >
      {children}
    </button>
  );
}

export function GroupChip({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  const on = value !== null;
  const dec = () => onChange(value === null || value <= 2 ? null : value - 1);
  const inc = () => onChange(value === null ? 2 : Math.min(30, value + 1));
  const btn = `grid size-7 place-items-center rounded-full text-base font-bold ${on ? 'bg-white/15' : 'bg-bg'}`;
  return (
    <div
      className={`inline-flex min-h-10 flex-none items-center gap-1.5 rounded-full border pr-1.5 pl-3 text-[13px] font-semibold whitespace-nowrap ${
        on ? 'border-ink bg-ink text-bg' : 'border-line bg-surface text-ink'
      }`}
    >
      <span>👥 {on ? fi.filters.groupN(value) : fi.filters.groupAny}</span>
      {/* Minus only when a size is set, keeping the chip narrow by default. */}
      {on && (
        <button type="button" onClick={dec} aria-label="Pienempi ryhmä" className={btn}>
          −
        </button>
      )}
      <button type="button" onClick={inc} aria-label="Isompi ryhmä" className={btn}>
        +
      </button>
    </div>
  );
}
