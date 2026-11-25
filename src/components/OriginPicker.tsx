import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { searchTampere, type GeoResult } from '../domain/geocode';
import { isInTampere } from '../domain/tampere';
import { ORIGIN_PRESETS, isDefaultOrigin, useOrigin, type Origin } from '../state/originStore';
import { useToast } from '../state/toastStore';
import { SubHeading } from './SettingsControls';
import { fi } from '../i18n/fi';

type Status = { kind: 'idle' } | { kind: 'busy'; text: string } | { kind: 'error'; text: string };

/** Choose the starting point: ready-made spots, own location, address search (Tampere only), or a point on the map. */
export function OriginPicker() {
  const { origin, recent, setOrigin } = useOrigin(useShallow((s) => ({ origin: s.origin, recent: s.recent, setOrigin: s.setOrigin })));
  const showToast = useToast((s) => s.show);
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeoResult[] | null>(null);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const abortRef = useRef<AbortController>();

  useEffect(() => () => abortRef.current?.abort(), []);

  function choose(o: Origin) {
    if (!setOrigin(o)) {
      setStatus({ kind: 'error', text: fi.origin.outside });
      return;
    }
    setStatus({ kind: 'idle' });
    setResults(null);
    setQuery('');
    showToast(fi.origin.set(o.name));
  }

  function locate() {
    if (!('geolocation' in navigator)) {
      setStatus({ kind: 'error', text: fi.origin.locationUnsupported });
      return;
    }
    setStatus({ kind: 'busy', text: fi.origin.locating });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        if (!isInTampere(lat, lon)) {
          setStatus({ kind: 'error', text: fi.origin.locationOutside });
          return;
        }
        choose({ id: 'gps', name: fi.origin.myLocation, lat: round(lat), lon: round(lon), kind: 'gps' });
      },
      () => setStatus({ kind: 'error', text: fi.origin.locationDenied }),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 },
    );
  }

  async function search(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (q.length < 2 || status.kind === 'busy') return;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setStatus({ kind: 'busy', text: fi.origin.searching });
    try {
      setResults(await searchTampere(q, ac.signal));
      setStatus({ kind: 'idle' });
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setResults(null);
      setStatus({ kind: 'error', text: fi.origin.searchError });
    }
  }

  const isCurrent = (o: Origin) => o.lat === origin.lat && o.lon === origin.lon;
  const busy = status.kind === 'busy';

  return (
    <>
      <div className="flex items-center justify-between gap-2 rounded-2xl bg-bg px-4 py-3">
        <span className="min-w-0">
          <span className="block text-[11px] font-bold tracking-wide text-ink-3 uppercase">{fi.origin.current}</span>
          <span className="block truncate font-extrabold">🏠 {origin.name}</span>
        </span>
        {!isDefaultOrigin(origin) && (
          <button type="button" onClick={() => choose(ORIGIN_PRESETS[0]!)} className="flex-none text-[13px] font-bold text-accent-text">
            {fi.origin.reset}
          </button>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={locate} disabled={busy} className="min-h-11 rounded-xl border border-line bg-surface px-3 text-[13px] font-bold disabled:opacity-60">
          {fi.origin.useLocation}
        </button>
        <button type="button" onClick={() => navigate('/kartta?valitse=1')} className="min-h-11 rounded-xl border border-line bg-surface px-3 text-[13px] font-bold">
          {fi.origin.pickOnMap}
        </button>
      </div>

      <form onSubmit={search} className="mt-3" role="search">
        <label htmlFor="origin-search" className="sr-only">
          {fi.origin.searchLabel}
        </label>
        <div className="flex gap-2">
          <input
            id="origin-search"
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={fi.origin.searchPlaceholder}
            className="min-h-11 min-w-0 flex-1 rounded-xl border border-line bg-bg px-3 text-[15px] outline-none focus-visible:border-accent"
          />
          <button type="submit" disabled={busy || query.trim().length < 2} className="min-h-11 rounded-xl bg-ink px-4 text-sm font-bold text-bg disabled:opacity-50">
            {fi.origin.search}
          </button>
        </div>
      </form>

      <div aria-live="polite">
        {status.kind !== 'idle' && (
          <p className={`mt-2 text-[13px] font-semibold ${status.kind === 'error' ? 'text-accent-text' : 'text-ink-2'}`}>{status.text}</p>
        )}
        {results && results.length === 0 && status.kind === 'idle' && <p className="mt-2 text-[13px] text-ink-2">{fi.origin.noResults}</p>}
      </div>
      {results && results.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1">
          {results.map((r) => (
            <li key={r.id}>
              <OptionRow title={r.name} sub={r.detail} onClick={() => choose({ id: r.id, name: r.name, lat: round(r.lat), lon: round(r.lon), kind: 'search' })} />
            </li>
          ))}
        </ul>
      )}
      <p className="mt-1.5 text-[11px] text-ink-3">{fi.origin.searchNote}</p>

      {recent.length > 0 && (
        <>
          <SubHeading>{fi.origin.recent}</SubHeading>
          <ul className="flex flex-col gap-1">
            {recent.map((o) => (
              <li key={`${o.id}-${o.lat}-${o.lon}`}>
                <OptionRow title={o.name} selected={isCurrent(o)} onClick={() => choose(o)} />
              </li>
            ))}
          </ul>
        </>
      )}

      <SubHeading>{fi.origin.presets}</SubHeading>
      <ul className="grid grid-cols-2 gap-1.5">
        {ORIGIN_PRESETS.map((o) => (
          <li key={o.id}>
            <OptionRow title={o.name} selected={isCurrent(o)} onClick={() => choose(o)} />
          </li>
        ))}
      </ul>
    </>
  );
}

function OptionRow({ title, sub, selected, onClick }: { title: string; sub?: string; selected?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex min-h-11 w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left ${selected ? 'bg-ink text-bg' : 'bg-bg'}`}
    >
      <span className="min-w-0">
        <span className="block truncate text-[14px] font-bold">{title}</span>
        {sub && <span className={`block truncate text-[12px] ${selected ? 'text-bg/75' : 'text-ink-2'}`}>{sub}</span>}
      </span>
      {selected && <span aria-hidden>✓</span>}
    </button>
  );
}

const round = (v: number) => Math.round(v * 1e6) / 1e6;
