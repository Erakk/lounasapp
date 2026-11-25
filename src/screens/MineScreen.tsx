import { useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { placeById } from '../data/places';
import { useAllNotes, useAllStats, useAllVisits } from '../db/hooks';
import { clearAll, exportAll, importBackup, parseBackup, setHidden } from '../db/repo';
import { daysSince, formatDate, relativeDay } from '../domain/stats';
import { useToast } from '../state/toastStore';
import { fi } from '../i18n/fi';

export function MineScreen() {
  const stats = useAllStats();
  const visits = useAllVisits();
  const notes = useAllNotes();
  const showToast = useToast((s) => s.show);
  const fileRef = useRef<HTMLInputElement>(null);

  const now = new Date();
  const derived = useMemo(() => {
    const rows = [...stats.entries()].filter(([id]) => placeById.has(id)).map(([id, s]) => ({ place: placeById.get(id)!, s }));
    return {
      top: rows.filter((r) => r.s.visitCount > 0).sort((a, b) => b.s.visitCount - a.s.visitCount).slice(0, 5),
      favourites: rows.filter((r) => r.s.favourite).sort((a, b) => a.place.name.localeCompare(b.place.name, 'fi')),
      stale: rows
        .filter((r) => r.s.lastVisited && daysSince(r.s.lastVisited) >= 30 && !r.s.hidden)
        .sort((a, b) => a.s.lastVisited!.localeCompare(b.s.lastVisited!))
        .slice(0, 5),
      hidden: rows.filter((r) => r.s.hidden),
      places: rows.filter((r) => r.s.visitCount > 0).length,
    };
  }, [stats]);
  const monthVisits = visits.filter((v) => {
    const d = new Date(v.date);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;

  const hasData = visits.length > 0 || notes.length > 0 || derived.favourites.length > 0 || derived.hidden.length > 0;

  const onExport = async () => {
    const backup = await exportAll();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lounas-varmuuskopio-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast(fi.mine.exported);
  };

  const onImportFile = async (file: File) => {
    try {
      const backup = parseBackup(await file.text());
      if (!window.confirm(fi.mine.importConfirm(backup.visits.length, backup.notes.length))) return;
      const c = await importBackup(backup);
      showToast(fi.mine.imported(c.visits, c.notes));
    } catch (e) {
      showToast((e as Error).message);
    }
  };

  const onClear = async () => {
    if (!window.confirm(fi.mine.clearConfirm)) return;
    await clearAll();
    showToast(fi.mine.cleared);
  };

  return (
    <div className="px-4 pt-6 pb-8">
      <h1 className="font-display text-[26px] font-bold">{fi.mine.title}</h1>
      <p className="mt-0.5 text-[13px] text-ink-2">{fi.mine.subtitle}</p>

      <dl className="mt-4 grid grid-cols-2 gap-2.5">
        <Stat label={fi.mine.statVisits} value={visits.length} />
        <Stat label={fi.mine.statMonth} value={monthVisits} />
        <Stat label={fi.mine.statPlaces} value={derived.places} />
        <Stat label={fi.mine.statNotes} value={notes.length} />
      </dl>

      {!hasData && <p className="mt-5 rounded-[18px] bg-surface p-4 text-sm text-ink-2 shadow-card">{fi.mine.empty}</p>}

      {derived.top.length > 0 && (
        <Section title={fi.mine.top}>
          {derived.top.map(({ place, s }, i) => (
            <Row key={place.id} to={place.id} left={`${i + 1}. ${place.name}`} right={`${s.visitCount}×`} />
          ))}
        </Section>
      )}

      {derived.favourites.length > 0 && (
        <Section title={`♥ ${fi.mine.favourites}`}>
          {derived.favourites.map(({ place, s }) => (
            <Row key={place.id} to={place.id} left={place.name} right={s.lastVisited ? relativeDay(s.lastVisited) : ''} />
          ))}
        </Section>
      )}

      {derived.stale.length > 0 && (
        <Section title={fi.mine.stale} hint={fi.mine.staleHint}>
          {derived.stale.map(({ place, s }) => (
            <Row key={place.id} to={place.id} left={place.name} right={relativeDay(s.lastVisited!)} />
          ))}
        </Section>
      )}

      {notes.length > 0 && (
        <Section title={fi.mine.recentNotes}>
          {notes.slice(0, 5).map((n) => (
            <Link key={n.id} to={`/paikka/${n.placeId}`} className="block border-b border-line py-2.5 last:border-0">
              <div className="flex items-center justify-between text-sm font-bold">
                <span className="truncate">{placeById.get(n.placeId)?.name ?? n.placeId}</span>
                <span className="ml-2 flex-none text-[11px] font-semibold text-ink-3">{formatDate(n.date)}</span>
              </div>
              <div className="text-[13px] text-ink-2">
                {n.stars ? <span className="mr-1 text-amber">{'★'.repeat(n.stars)}</span> : null}
                <span className="line-clamp-2">{n.text || n.tags.join(', ')}</span>
              </div>
            </Link>
          ))}
        </Section>
      )}

      {derived.hidden.length > 0 && (
        <Section title={`🙈 ${fi.mine.hidden}`}>
          {derived.hidden.map(({ place }) => (
            <div key={place.id} className="flex items-center justify-between border-b border-line py-2 last:border-0">
              <Link to={`/paikka/${place.id}`} className="truncate text-sm font-semibold">
                {place.name}
              </Link>
              <button type="button" onClick={() => void setHidden(place.id, false)} className="ml-2 rounded-lg px-2 py-1 text-xs font-bold text-accent-text">
                {fi.mine.restore}
              </button>
            </div>
          ))}
        </Section>
      )}

      <Section title={fi.mine.backup} hint={fi.mine.backupHint}>
        <div className="flex flex-col gap-2 py-1">
          <button type="button" onClick={() => void onExport()} className="min-h-11 rounded-xl bg-ink px-4 text-sm font-bold text-bg">
            ⬇️ {fi.mine.export}
          </button>
          <button type="button" onClick={() => fileRef.current?.click()} className="min-h-11 rounded-xl border border-line px-4 text-sm font-bold">
            ⬆️ {fi.mine.import}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) void onImportFile(file);
            }}
          />
        </div>
      </Section>

      {hasData && (
        <div className="mt-6 text-center">
          <button type="button" onClick={() => void onClear()} className="rounded-xl px-3 py-2 text-xs font-bold text-ink-3 hover:text-accent-text">
            {fi.mine.clear}
          </button>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[18px] bg-surface p-3.5 shadow-card">
      <dd className="m-0 font-display text-[30px] leading-none font-bold text-accent-text">{value}</dd>
      <dt className="mt-1 text-xs font-semibold text-ink-2">{label}</dt>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <h2 className="text-base font-extrabold">{title}</h2>
      {hint && <p className="text-xs text-ink-3">{hint}</p>}
      <div className="mt-2 rounded-[18px] bg-surface px-3.5 py-1 shadow-card">{children}</div>
    </section>
  );
}

function Row({ to, left, right }: { to: string; left: string; right: string }) {
  return (
    <Link to={`/paikka/${to}`} className="flex items-center justify-between border-b border-line py-2.5 text-sm last:border-0">
      <span className="truncate font-semibold">{left}</span>
      <span className="ml-2 flex-none text-xs font-bold text-ink-2">{right}</span>
    </Link>
  );
}
