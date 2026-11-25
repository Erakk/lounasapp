import { useEffect, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { AREA_OPTIONS, PRICE_OPTIONS, WALK_OPTIONS } from '../domain/filters';
import { DIETS, FORMATS } from '../domain/schema';
import { selectFilters, useFilters } from '../state/filterStore';
import { GroupChip } from './FilterBar';
import { fi } from '../i18n/fi';

interface Props {
  open: boolean;
  resultCount: number;
  onClose: () => void;
}

/** Bottom sheet with every filter. */
export function FilterSheet({ open, resultCount, onClose }: Props) {
  const f = useFilters(useShallow(selectFilters));
  const { set, toggleFormat, toggleDiet, reset } = useFilters(
    useShallow((s) => ({ set: s.set, toggleFormat: s.toggleFormat, toggleDiet: s.toggleDiet, reset: s.reset })),
  );
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40">
          {/* CSS-only animations (anim-fade / anim-sheet in index.css) keep this out of the animation library. */}
          <div className="anim-fade absolute inset-0 bg-black/40" onClick={onClose} />
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={fi.filters.title}
            tabIndex={-1}
            className="anim-sheet absolute inset-x-0 bottom-0 mx-auto flex max-h-[88vh] max-w-[480px] flex-col rounded-t-[28px] bg-surface shadow-card outline-none"
          >
            <div className="flex items-center justify-between px-5 pt-3 pb-2">
              <span aria-hidden className="absolute top-2 left-1/2 h-1 w-10 -translate-x-1/2 rounded-full bg-line" />
              <h2 className="mt-3 font-display text-xl font-bold">{fi.filters.title}</h2>
              <button type="button" onClick={reset} className="mt-3 text-sm font-bold text-accent-text">
                {fi.filters.reset}
              </button>
            </div>

            <div className="overflow-y-auto px-5 pb-4">
              <Section title={fi.filters.sections.group}>
                <GroupChip value={f.groupSize} onChange={(groupSize) => set({ groupSize })} />
              </Section>

              <Section title={fi.filters.sections.area} hint={fi.filters.areaHint}>
                <AreaPicker value={f.maxDistanceM} onChange={(maxDistanceM) => set({ maxDistanceM })} />
              </Section>

              <Section title={fi.filters.sections.walk}>
                <Segmented
                  options={[null, ...WALK_OPTIONS]}
                  value={f.maxWalk}
                  label={(v) => (v === null ? fi.filters.any : `${v} min`)}
                  onChange={(maxWalk) => set({ maxWalk })}
                />
              </Section>

              <Section title={fi.filters.sections.price} hint={fi.filters.priceUnknownNote}>
                <Segmented
                  options={[null, ...PRICE_OPTIONS]}
                  value={f.maxPrice}
                  label={(v) => (v === null ? fi.filters.any : `${v} €`)}
                  onChange={(maxPrice) => set({ maxPrice })}
                />
              </Section>

              <Section title={fi.filters.sections.format}>
                <div className="flex flex-wrap gap-2">
                  {FORMATS.map((fmt) => (
                    <Toggle key={fmt} on={f.formats.includes(fmt)} onClick={() => toggleFormat(fmt)}>
                      {fi.formats[fmt]}
                    </Toggle>
                  ))}
                </div>
              </Section>

              <Section title={fi.filters.sections.diet}>
                <div className="flex flex-wrap gap-2">
                  {DIETS.map((d) => (
                    <Toggle key={d} on={f.diets.includes(d)} onClick={() => toggleDiet(d)}>
                      {fi.diets[d]}
                    </Toggle>
                  ))}
                </div>
              </Section>

              <Section title={fi.filters.sections.other}>
                <Switch label={fi.filters.openNow} checked={f.openNow} onChange={(openNow) => set({ openNow })} />
                <Switch label={fi.filters.favouritesOnly} checked={f.favouritesOnly} onChange={(favouritesOnly) => set({ favouritesOnly })} />
                <Switch
                  label={fi.filters.hideHighRisk}
                  hint={fi.filters.hideHighRiskHint}
                  checked={f.hideHighRisk}
                  onChange={(hideHighRisk) => set({ hideHighRisk })}
                />
                <Switch
                  label={fi.filters.verifiedPriceOnly}
                  checked={f.verifiedPriceOnly}
                  onChange={(verifiedPriceOnly) => set({ verifiedPriceOnly })}
                />
                <Switch
                  label={fi.filters.showUnverified}
                  hint={fi.filters.showUnverifiedHint}
                  checked={f.showUnverified}
                  onChange={(showUnverified) => set({ showUnverified })}
                />
                <Switch label={fi.filters.showHidden} checked={f.showHidden} onChange={(showHidden) => set({ showHidden })} />
              </Section>
            </div>

            <div className="border-t border-line px-5 pt-3 pb-[calc(14px+env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={onClose}
                className="h-13 w-full rounded-[16px] bg-accent py-3.5 text-base font-extrabold text-accent-ink"
              >
                {fi.filters.show(resultCount)}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-line py-4 last:border-0">
      <h3 className="mb-2.5 text-[12px] font-bold tracking-wide text-ink-3 uppercase">{title}</h3>
      {children}
      {hint && <p className="mt-2 text-xs text-ink-3">{hint}</p>}
    </section>
  );
}

export function Segmented<T extends number | null>({
  options,
  value,
  label,
  onChange,
  ariaLabel,
}: {
  options: readonly T[];
  value: T;
  label: (v: T) => string;
  onChange: (v: T) => void;
  ariaLabel?: string;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="grid gap-1 rounded-2xl bg-bg p-1" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map((o) => {
        const on = o === value;
        return (
          <button
            key={String(o)}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o)}
            className={`min-h-10 rounded-xl text-[13px] font-bold transition-colors ${on ? 'bg-surface text-ink shadow-card' : 'text-ink-2'}`}
          >
            {label(o)}
          </button>
        );
      })}
    </div>
  );
}

/** Area radius around the starting point: 500 m … 5 km or all of Tampere. */
export function AreaPicker({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  return (
    <Segmented
      options={AREA_OPTIONS}
      value={value}
      label={(v) => (v === null ? fi.filters.any : fi.filters.areaLabel(v))}
      onChange={onChange}
      ariaLabel={fi.filters.sections.area}
    />
  );
}

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`min-h-10 rounded-full border px-3.5 text-[13px] font-semibold transition-colors ${
        on ? 'border-ink bg-ink text-bg' : 'border-line bg-surface text-ink'
      }`}
    >
      {on && '✓ '}
      {children}
    </button>
  );
}

export function Switch({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-2">
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        {hint && <span className="block text-xs text-ink-3">{hint}</span>}
      </span>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span
        aria-hidden
        className="relative h-7 w-12 flex-none rounded-full bg-line transition-colors peer-checked:bg-sage peer-focus-visible:ring-2 peer-focus-visible:ring-accent after:absolute after:top-0.5 after:left-0.5 after:size-6 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5"
      />
    </label>
  );
}
