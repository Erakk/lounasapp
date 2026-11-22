import { PRICE_OPTIONS, WALK_OPTIONS } from '../domain/filters';
import { useFilters, selectFilters } from '../state/filterStore';
import { useShallow } from 'zustand/react/shallow';
import { fi } from '../i18n/fi';

const cycle = <T,>(options: readonly T[], current: T | null): T | null => {
  if (current === null) return options[0]!;
  const i = options.indexOf(current);
  return i < 0 || i === options.length - 1 ? null : options[i + 1]!;
};

/**
 * The four quick filters as an even 2 × 2 grid, so they line up neatly on any phone width.
 * Tapping walk/price cycles through values. Everything else lives behind the "Suodattimet" button in the header.
 */
export function FilterBar() {
  const f = useFilters(useShallow(selectFilters));
  const set = useFilters((s) => s.set);

  return (
    <div role="toolbar" aria-label={fi.filters.title} className="grid grid-cols-2 gap-2">
      <GroupChip value={f.groupSize} onChange={(groupSize) => set({ groupSize })} fill />
      <Chip on={f.maxWalk !== null} onClick={() => set({ maxWalk: cycle(WALK_OPTIONS, f.maxWalk) })}>
        🚶 {f.maxWalk === null ? fi.filters.walk : fi.filters.walkMax(f.maxWalk)}
      </Chip>
      <Chip on={f.maxPrice !== null} onClick={() => set({ maxPrice: cycle(PRICE_OPTIONS, f.maxPrice) })}>
        💶 {f.maxPrice === null ? fi.filters.price : fi.filters.priceMax(f.maxPrice)}
      </Chip>
      <Chip on={f.openNow} tone="sage" onClick={() => set({ openNow: !f.openNow })} pressed={f.openNow}>
        <span aria-hidden className="size-2 rounded-full bg-sage" /> {fi.filters.openNow}
      </Chip>
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
      className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full border px-3.5 text-[13px] font-semibold whitespace-nowrap transition-colors ${style}`}
    >
      {children}
    </button>
  );
}

export function GroupChip({ value, onChange, fill }: { value: number | null; onChange: (v: number | null) => void; fill?: boolean }) {
  const on = value !== null;
  const dec = () => onChange(value === null || value <= 2 ? null : value - 1);
  const inc = () => onChange(value === null ? 2 : Math.min(30, value + 1));
  const btn = `grid size-7 place-items-center rounded-full text-base font-bold ${on ? 'bg-white/15' : 'bg-bg'}`;
  return (
    <div
      className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border pr-1.5 pl-3.5 text-[13px] font-semibold whitespace-nowrap ${
        fill ? 'justify-between' : 'flex-none'
      } ${on ? 'border-ink bg-ink text-bg' : 'border-line bg-surface text-ink'}`}
    >
      <span>👥 {on ? fi.filters.groupN(value) : fi.filters.groupAny}</span>
      <span className="flex items-center gap-1">
        {/* Minus only when a size is set. */}
        {on && (
          <button type="button" onClick={dec} aria-label="Pienempi ryhmä" className={btn}>
            −
          </button>
        )}
        <button type="button" onClick={inc} aria-label="Isompi ryhmä" className={btn}>
          +
        </button>
      </span>
    </div>
  );
}
