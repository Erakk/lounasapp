import { AREA_OPTIONS } from '../domain/filters';
import { fi } from '../i18n/fi';

/** A titled block on the Asetukset screen. `id` lets other screens link straight to it (?osio=<id>). */
export function SettingsSection({ id, title, hint, children }: { id?: string; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section id={id ? `osio-${id}` : undefined} aria-label={title} className="mt-3 scroll-mt-4 rounded-[var(--radius-card)] bg-surface px-4 py-3.5 shadow-card">
      <h2 className="mb-2.5 text-[12px] font-bold tracking-wide text-ink-3 uppercase">{title}</h2>
      {children}
      {hint && <p className="mt-2 text-xs text-ink-3">{hint}</p>}
    </section>
  );
}

/** Smaller heading inside a section. */
export function SubHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="mt-4 mb-2 text-sm font-extrabold first:mt-0">{children}</h3>;
}

export function Segmented<T extends number | string | null>({
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

export function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
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

/** Group size: "Kaikki" or 2–30 people, with − / + buttons. */
export function GroupStepper({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  const dec = () => onChange(value === null || value <= 2 ? null : value - 1);
  const inc = () => onChange(value === null ? 2 : Math.min(30, value + 1));
  const btn = 'grid size-10 place-items-center rounded-xl bg-surface text-lg font-bold shadow-card disabled:opacity-40';
  return (
    <div className="flex items-center justify-between rounded-2xl bg-bg p-1">
      <button type="button" onClick={dec} disabled={value === null} aria-label="Pienempi ryhmä" className={btn}>
        −
      </button>
      <span aria-live="polite" className="text-sm font-bold">
        👥 {value === null ? fi.filters.any : fi.filters.groupN(value)}
      </span>
      <button type="button" onClick={inc} disabled={value === 30} aria-label="Isompi ryhmä" className={btn}>
        +
      </button>
    </div>
  );
}
