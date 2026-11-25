import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useShallow } from 'zustand/react/shallow';
import { usePlaces } from '../state/usePlaces';
import { useOrigin } from '../state/originStore';
import { CATEGORIES, tileBg } from '../data/categories';
import { filterPlaces } from '../domain/filters';
import { weekdayOf } from '../domain/openingHours';
import { buildOptions, pickRandom, type RandomOption } from '../domain/randomPick';
import { distanceLabel, hoursToday, priceLabel } from '../domain/format';
import { relativeDay } from '../domain/stats';
import { useAllStats } from '../db/hooks';
import { addVisit, removeVisit } from '../db/repo';
import { selectFilters, useFilters } from '../state/filterStore';
import { selectRandomSettings, useRandomSettings } from '../state/randomStore';
import { useToast } from '../state/toastStore';
import { ScopeLink } from '../components/ScopeLink';
import { CategoryChips } from '../components/CategoryChips';
import { fi } from '../i18n/fi';

type Phase = 'rolling' | 'result' | 'done' | 'empty';

export function RandomScreen() {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const filters = useFilters(useShallow(selectFilters));
  const toggleCategory = useFilters((s) => s.toggleCategory);
  const settings = useRandomSettings(useShallow(selectRandomSettings));
  const stats = useAllStats();
  const showToast = useToast((s) => s.show);

  const places = usePlaces();
  const originId = useOrigin((s) => s.origin.id);
  const now = useMemo(() => new Date(), []);
  // Exactly the same filtering as the home list (shared filter store), then the random-only rules on top.
  const listPlaces = useMemo(() => filterPlaces(places, filters, now, stats), [places, filters, stats, now]);
  const options = useMemo(() => buildOptions(listPlaces, stats, settings, now), [listPlaces, settings, stats, now]);

  // Why the random pick may have fewer places than the list: explain it instead of hiding it.
  const left = useMemo(() => {
    const today = weekdayOf(now);
    const noLunch = settings.lunchTodayOnly ? listPlaces.filter((p) => !p.lunchHours[today]?.length).length : 0;
    const unverified = settings.skipUnverified
      ? listPlaces.filter((p) => p.status !== 'open' && (!settings.lunchTodayOnly || p.lunchHours[today]?.length)).length
      : 0;
    return { noLunch, unverified, included: listPlaces.length - noLunch - unverified };
  }, [listPlaces, settings, now]);

  const [phase, setPhase] = useState<Phase>('rolling');
  const [winner, setWinner] = useState<RandomOption>();
  const [flash, setFlash] = useState<string>(''); // names flicking past during the shuffle
  const [confettiKey, setConfettiKey] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval>>();

  const roll = useCallback(() => {
    clearInterval(timer.current);
    const pick = pickRandom(options, Math.random, winner?.id);
    if (!pick) {
      setWinner(undefined);
      setPhase('empty');
      return;
    }
    if (reduceMotion || options.length < 2) {
      setWinner(pick);
      setPhase('result');
      return;
    }
    setPhase('rolling');
    let ticks = 0;
    timer.current = setInterval(() => {
      const o = options[Math.floor(Math.random() * options.length)]!;
      setFlash(o.kind === 'place' ? o.place.name : o.name);
      if (++ticks >= 12) {
        clearInterval(timer.current);
        setWinner(pick);
        setPhase('result');
      }
    }, 90);
  }, [options, reduceMotion, winner?.id]);

  // Roll straight away when the screen opens ("two taps to a decision"). Runs on mount only; the cleanup
  // stops a shuffle in progress, and React's dev double-mount simply rolls again.
  const rollRef = useRef(roll);
  rollRef.current = roll;
  useEffect(() => {
    rollRef.current();
    return () => clearInterval(timer.current);
  }, []);

  // Changing filters or settings here (or on the list) picks again, so the result always matches them.
  const criteriaKey = JSON.stringify(filters) + JSON.stringify(settings) + originId;
  const firstKey = useRef(criteriaKey);
  useEffect(() => {
    if (criteriaKey === firstKey.current) return;
    firstKey.current = criteriaKey;
    // Hide the old result at once: it may no longer match the new filters.
    clearInterval(timer.current);
    setFlash('');
    setPhase('rolling');
    const t = setTimeout(() => rollRef.current(), 350); // wait for a burst of taps (e.g. + + +) to settle
    return () => clearTimeout(t);
  }, [criteriaKey]);

  // If settings or filters change so much that nothing is left, say so.
  useEffect(() => {
    if (!options.length && phase !== 'rolling') setPhase('empty');
  }, [options.length, phase]);

  const go = async () => {
    if (!winner) return;
    if (winner.kind === 'place') {
      const v = await addVisit(winner.place.id, filters.groupSize ?? undefined);
      navigator.vibrate?.([20, 40, 20]);
      showToast(fi.visits.logged(winner.place.name), { label: fi.visits.undo, run: () => void removeVisit(v.id) });
    }
    setConfettiKey((k) => k + 1);
    setPhase('done');
  };


  return (
    <div className="relative min-h-[calc(100vh-84px)] overflow-hidden bg-gradient-to-b from-accent to-[#9E2537] px-5 pt-10 pb-6 text-white">
      {confettiKey > 0 && !reduceMotion && <Confetti key={confettiKey} />}

      <button
        type="button"
        onClick={() => navigate('/')}
        aria-label={fi.random.close}
        className="absolute top-4 right-4 grid size-10 place-items-center rounded-full bg-white/20 text-lg"
      >
        ✕
      </button>

      <h1 className="pr-12 font-display text-[28px] leading-tight font-bold">{phase === 'done' ? fi.random.done : fi.random.title}</h1>
      <p className="mt-1.5 text-[13px] opacity-90">
        {fi.random.fromList(left.included, listPlaces.length)}
        {left.noLunch > 0 && ` · ${fi.random.noLunchCount(left.noLunch)}`}
        {left.unverified > 0 && ` · ${fi.random.unverifiedCount(left.unverified)}`}
        {(left.noLunch > 0 || left.unverified > 0) && (
          <>
            {' '}
            <Link to="/asetukset?osio=arvonta" className="font-bold underline underline-offset-2">
              {fi.random.change}
            </Link>
          </>
        )}
      </p>

      {/* Same filters as the home list – changes apply to both. */}
      <section aria-label={fi.random.filtersTitle} className="mx-auto mt-3 max-w-[340px] rounded-[20px] bg-surface p-2.5 text-ink shadow-[0_8px_24px_rgb(0_0_0/.15)]">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 pl-1">
          <h2 className="text-sm font-extrabold">{fi.random.filtersTitle}</h2>
          <ScopeLink className="!min-h-8 !text-[12px]" />
        </div>
        <CategoryChips selected={filters.categories} onToggle={toggleCategory} />
      </section>

      <div className="relative mt-5 min-h-[260px]">
        {phase !== 'empty' && (
          <>
            <div aria-hidden className="absolute inset-x-8 top-4 h-[230px] -rotate-6 rounded-[28px] bg-white/25" />
            <div aria-hidden className="absolute inset-x-8 top-2 h-[230px] rotate-[5deg] rounded-[28px] bg-white/35" />
          </>
        )}

        <AnimatePresence initial={false}>
          {phase === 'rolling' && (
            <motion.div
              key="rolling"
              className="relative mx-auto grid h-[240px] max-w-[300px] place-items-center rounded-[28px] bg-surface p-6 text-center text-ink shadow-[0_30px_60px_rgb(0_0_0/.25)]"
            >
              <div>
                <div aria-hidden className="mb-3 animate-bounce text-5xl">
                  🎲
                </div>
                <div className="text-xs font-bold tracking-wide text-ink-3 uppercase">{fi.random.rolling}</div>
                <div className="mt-1 h-8 font-display text-xl font-bold">{flash}</div>
              </div>
            </motion.div>
          )}

          {(phase === 'result' || phase === 'done') && winner && (
            <motion.div
              key={winner.id + phase}
              initial={reduceMotion ? { opacity: 0 } : { rotateY: 90, scale: 0.9, opacity: 0 }}
              animate={reduceMotion ? { opacity: 1 } : { rotateY: 0, scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 220, damping: 20 }}
              className="relative mx-auto max-w-[300px] overflow-hidden rounded-[28px] bg-surface text-ink shadow-[0_30px_60px_rgb(0_0_0/.25)]"
              aria-live="polite"
            >
              {winner.kind === 'place' ? <PlaceWinner option={winner} lastVisited={stats.get(winner.place.id)?.lastVisited} now={now} /> : <ClusterWinner option={winner} />}
            </motion.div>
          )}

          {phase === 'empty' && (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto max-w-[300px] rounded-[28px] bg-surface p-6 text-center text-ink">
              <div aria-hidden className="text-4xl">
                🤷
              </div>
              <p className="mt-2 font-bold">{fi.random.empty}</p>
              <p className="mt-1 text-sm text-ink-2">{fi.random.emptyHint}</p>
              <Link to="/asetukset" className="mt-4 inline-block rounded-xl bg-ink px-4 py-2.5 text-sm font-bold text-bg">
                {fi.random.toFilters}
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mx-auto mt-4 flex max-w-[340px] gap-2.5">
        {phase === 'result' && (
          <button type="button" onClick={() => void go()} className="h-14 flex-[1.5] rounded-[18px] bg-white text-[17px] font-extrabold text-[#A8283B] active:scale-[.98]">
            {fi.random.go}
          </button>
        )}
        {phase === 'done' && winner?.kind === 'place' && <p className="flex-[1.5] self-center text-center text-[13px] leading-snug opacity-90">{fi.random.doneSub}</p>}
        {phase !== 'rolling' && options.length > 0 && (
          <button
            type="button"
            onClick={roll}
            className="h-14 flex-1 rounded-[18px] border-2 border-white/60 text-[15px] font-extrabold whitespace-nowrap active:scale-[.98]"
          >
            {phase === 'empty' ? fi.random.roll : fi.random.again}
          </button>
        )}
      </div>


      <div className="mx-auto mt-4 max-w-[340px] text-center">
        <Link to="/asetukset?osio=arvonta" className="text-[13px] font-bold underline-offset-2 opacity-90 hover:underline">
          ⚙️ {fi.random.settings}
        </Link>
      </div>
    </div>
  );
}

function PlaceWinner({ option, lastVisited, now }: { option: Extract<RandomOption, { kind: 'place' }>; lastVisited?: string; now: Date }) {
  const p = option.place;
  const cat = CATEGORIES.find((c) => c.id === p.categories[0])!;
  const hours = hoursToday(p, now);
  const price = priceLabel(p);
  return (
    <>
      <div aria-hidden className="grid h-[110px] place-items-center text-[60px]" style={{ background: tileBg(cat.tile) }}>
        {cat.emoji}
      </div>
      <div className="p-4 pt-3.5">
        <div className="flex flex-wrap gap-1.5 text-[10.5px] font-bold">
          <span className="rounded-full bg-sage-soft px-2 py-0.5 text-sage-ink">{hours ? `Lounas ${hours}` : fi.random.noLunchToday}</span>
          <span className="rounded-full bg-bg px-2 py-0.5 text-ink-2">{fi.formats[p.format]}</span>
        </div>
        <h2 className="mt-1.5 font-display text-2xl leading-tight font-bold">{p.name}</h2>
        <p className="mt-1 flex flex-wrap gap-x-2.5 text-xs text-ink-2">
          <span>{distanceLabel(p)}</span>
          {price && <span>{price}</span>}
          <span>{cat.label}</span>
          {lastVisited && <span>Käyty {relativeDay(lastVisited)}</span>}
        </p>
        {p.info[0] && <p className="mt-2 text-xs text-ink-2">{p.info[0]}</p>}
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
          {p.links.lunchList && (
            <a href={p.links.lunchList} target="_blank" rel="noreferrer" className="rounded-xl bg-bg px-3 py-2">
              {fi.random.lunchList}
            </a>
          )}
          <a
            href={`https://www.google.com/maps/dir/?api=1&travelmode=walking&destination=${p.lat},${p.lon}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl bg-bg px-3 py-2"
          >
            {fi.random.route}
          </a>
          <Link to={`/paikka/${p.id}`} className="rounded-xl bg-bg px-3 py-2">
            {fi.random.details}
          </Link>
        </div>
      </div>
    </>
  );
}

function ClusterWinner({ option }: { option: Extract<RandomOption, { kind: 'cluster' }> }) {
  const shown = option.places.slice(0, 10);
  return (
    <>
      <div aria-hidden className="grid h-[96px] place-items-center bg-[#E6E6F2] text-[52px]">
        🏬
      </div>
      <div className="p-4 pt-3.5">
        <h2 className="font-display text-2xl leading-tight font-bold">{option.name}</h2>
        <p className="mt-0.5 text-xs text-ink-2">{fi.random.clusterOpen(option.places.length)}</p>
        <p className="mt-2 text-xs text-ink-2">{fi.random.clusterHint}</p>
        <ul className="mt-2.5 flex flex-wrap gap-1.5">
          {shown.map((p) => (
            <li key={p.id}>
              <Link to={`/paikka/${p.id}`} className="block rounded-full bg-bg px-2.5 py-1 text-xs font-semibold hover:bg-line">
                {p.name}
              </Link>
            </li>
          ))}
          {option.places.length > shown.length && <li className="px-1 py-1 text-xs text-ink-3">+{option.places.length - shown.length}</li>}
        </ul>
      </div>
    </>
  );
}


const COLORS = ['#FFD166', '#FFFFFF', '#7FA387', '#F9E1E4', '#E2A23B'];
function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 0.25}s`,
        dx: `${(Math.random() - 0.5) * 160}px`,
        rot: `${360 + Math.random() * 540}deg`,
        color: COLORS[i % COLORS.length],
      })),
    [],
  );
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{ left: p.left, background: p.color, animationDelay: p.delay, ['--dx' as string]: p.dx, ['--rot' as string]: p.rot }}
        />
      ))}
    </div>
  );
}
