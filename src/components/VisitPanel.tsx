import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { addVisit, removeVisit, restoreVisit } from '../db/repo';
import type { Visit } from '../db/db';
import { useVisits } from '../db/hooks';
import { formatDate, relativeDay } from '../domain/stats';
import { useFilters } from '../state/filterStore';
import { useToast } from '../state/toastStore';
import { fi } from '../i18n/fi';

/** Big "+1 Kävimme" counter for a place, with −1 for a misclick, undo, and visit history. */
export function VisitPanel({ placeId, placeName }: { placeId: string; placeName: string }) {
  const visits = useVisits(placeId);
  const groupSize = useFilters((s) => s.groupSize);
  const showToast = useToast((s) => s.show);
  const [showHistory, setShowHistory] = useState(false);

  const count = visits.length;
  const last = visits[0];

  const logVisit = async () => {
    const v = await addVisit(placeId, groupSize ?? undefined);
    navigator.vibrate?.(15);
    showToast(fi.visits.logged(placeName), { label: fi.visits.undo, run: () => void removeVisit(v.id) });
  };

  // Removing is always undoable from the toast, so no confirm dialog is needed.
  const dropVisit = async (v: Visit) => {
    await removeVisit(v.id);
    showToast(fi.visits.removed(formatDate(v.date)), { label: fi.visits.undo, run: () => void restoreVisit(v) });
  };

  return (
    <section className="mt-3.5 rounded-[22px] bg-accent-soft p-3.5">
      <div className="flex items-center gap-3.5">
        <div className="relative grid min-w-11 place-items-center overflow-hidden font-display text-[40px] leading-none font-bold text-accent-text">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={count}
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -24, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            >
              {count}
            </motion.span>
          </AnimatePresence>
        </div>
        <div className="min-w-0 flex-1 text-[13px] text-ink-2">
          <b className="block text-sm text-ink">{count ? fi.visits.count(count) : fi.visits.none}</b>
          {last ? (
            <span>
              {fi.visits.last} {relativeDay(last.date)}
              {last.groupSize ? ` · ${last.groupSize} hlö` : ''}
            </span>
          ) : (
            <span>{fi.visits.hint}</span>
          )}
        </div>
        <button
          type="button"
          onClick={logVisit}
          className="flex-none rounded-[14px] bg-accent px-3.5 py-3 text-sm font-extrabold text-accent-ink active:scale-95"
        >
          {fi.visits.add}
        </button>
      </div>

      {count > 0 && (
        <>
          <div className="mt-2 flex items-center justify-between gap-2">
            <button
              type="button"
              aria-expanded={showHistory}
              onClick={() => setShowHistory((s) => !s)}
              className="min-h-9 text-xs font-bold text-accent-text"
            >
              {showHistory ? fi.visits.hideHistory : fi.visits.showHistory(count)}
            </button>
            {last && (
              <button
                type="button"
                onClick={() => void dropVisit(last)}
                aria-label={fi.visits.removeLatest}
                className="min-h-9 rounded-full border border-accent/40 bg-surface px-3 text-xs font-bold text-accent-text active:scale-95"
              >
                −1 {fi.visits.removeShort}
              </button>
            )}
          </div>
          {showHistory && (
            <ul className="mt-2 divide-y divide-line rounded-2xl bg-surface px-3">
              {visits.map((v) => (
                <li key={v.id} className="flex items-center justify-between py-2 text-sm">
                  <span>
                    {formatDate(v.date)}
                    {v.groupSize ? <span className="text-ink-3"> · {v.groupSize} hlö</span> : null}
                  </span>
                  <button
                    type="button"
                    aria-label={`${fi.visits.remove} ${formatDate(v.date)}`}
                    onClick={() => void dropVisit(v)}
                    className="min-h-9 rounded-lg px-2.5 text-xs font-bold text-accent-text hover:bg-bg"
                  >
                    {fi.visits.removeShort}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
