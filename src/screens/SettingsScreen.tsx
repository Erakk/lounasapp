import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { AreaPicker, Segmented, SettingsSection, Switch } from '../components/SettingsControls';
import { FilterControls } from '../components/FilterControls';
import { OriginPicker } from '../components/OriginPicker';
import { activeFilterCount, filterPlaces } from '../domain/filters';
import { useAllStats } from '../db/hooks';
import { selectFilters, useFilters } from '../state/filterStore';
import { selectRandomSettings, useRandomSettings } from '../state/randomStore';
import { useTheme, type ThemeChoice } from '../state/themeStore';
import { usePlaces } from '../state/usePlaces';
import { APP_VERSION, checkForUpdate, forceUpdate } from '../pwa';
import { fi } from '../i18n/fi';

/**
 * Everything that changes what the app shows, in one place: starting point, area, filters,
 * random-pick rules, appearance and app updates. The other tabs only show a summary that links here.
 */
export function SettingsScreen() {
  const [params] = useSearchParams();
  const filters = useFilters(useShallow(selectFilters));
  const { set, reset } = useFilters(useShallow((s) => ({ set: s.set, reset: s.reset })));
  const random = useRandomSettings(useShallow(selectRandomSettings));
  const setRandom = useRandomSettings((s) => s.set);
  const { theme, setTheme } = useTheme();
  const places = usePlaces();
  const stats = useAllStats();
  const now = useMemo(() => new Date(), []);
  const count = useMemo(() => filterPlaces(places, filters, now, stats).length, [places, filters, now, stats]);
  const filterCount = activeFilterCount(filters) + filters.categories.length;

  // Other screens link to a section: /asetukset?osio=arvonta
  useEffect(() => {
    const id = params.get('osio');
    if (id) document.getElementById(`osio-${id}`)?.scrollIntoView({ block: 'start' });
  }, [params]);

  return (
    <div className="px-4 pt-6 pb-4">
      <h1 className="font-display text-[26px] font-bold tracking-tight">{fi.settings.title}</h1>
      <p className="mt-0.5 text-[13px] text-ink-2">{fi.settings.intro}</p>

      {/* What the settings add up to, always visible while scrolling. */}
      <div className="sticky top-0 z-10 -mx-4 mt-3 bg-bg/95 px-4 py-2 backdrop-blur">
        <div className="flex items-center justify-between gap-2 rounded-2xl bg-ink px-4 py-2.5 text-bg">
          <span aria-live="polite" className="text-sm font-bold">
            {fi.settings.results(count)}
          </span>
          <Link to="/" className="flex-none rounded-xl bg-bg px-3 py-1.5 text-[13px] font-bold text-ink">
            {fi.settings.showList}
          </Link>
        </div>
      </div>

      <SettingsSection id="lahtopiste" title={fi.settings.origin} hint={fi.origin.intro}>
        <OriginPicker />
      </SettingsSection>

      <SettingsSection id="alue" title={fi.settings.area} hint={fi.filters.areaHint}>
        <AreaPicker value={filters.maxDistanceM} onChange={(maxDistanceM) => set({ maxDistanceM })} />
      </SettingsSection>

      <SettingsSection id="suodattimet" title={fi.settings.filters}>
        <FilterControls />
        {filterCount > 0 && (
          <button type="button" onClick={reset} className="mt-3 min-h-11 w-full rounded-xl border border-line text-sm font-bold text-accent-text">
            {fi.settings.resetFilters}
          </button>
        )}
      </SettingsSection>

      <SettingsSection id="arvonta" title={fi.settings.random}>
        <Switch label={fi.random.s.avoidRecent} hint={fi.random.s.avoidRecentHint} checked={random.avoidRecent} onChange={(avoidRecent) => setRandom({ avoidRecent })} />
        <Switch label={fi.random.s.preferLiked} checked={random.preferLiked} onChange={(preferLiked) => setRandom({ preferLiked })} />
        <Switch label={fi.random.s.clustersAsOne} checked={random.clustersAsOne} onChange={(clustersAsOne) => setRandom({ clustersAsOne })} />
        <Switch label={fi.random.s.avoidDivisive} checked={random.avoidDivisive} onChange={(avoidDivisive) => setRandom({ avoidDivisive })} />
        <Switch label={fi.random.s.lunchTodayOnly} checked={random.lunchTodayOnly} onChange={(lunchTodayOnly) => setRandom({ lunchTodayOnly })} />
        <Switch label={fi.random.s.skipUnverified} checked={random.skipUnverified} onChange={(skipUnverified) => setRandom({ skipUnverified })} />
      </SettingsSection>

      <SettingsSection id="ulkoasu" title={fi.settings.look}>
        <Segmented<ThemeChoice>
          options={['auto', 'light', 'dark']}
          value={theme}
          label={(t) => fi.mine.themes[t]}
          onChange={setTheme}
          ariaLabel={fi.mine.theme}
        />
      </SettingsSection>

      <SettingsSection id="sovellus" title={fi.settings.app}>
        <UpdateControls />
      </SettingsSection>
    </div>
  );
}

function UpdateControls() {
  const [state, setState] = useState<'idle' | 'checking' | 'latest' | 'offline' | 'updating'>('idle');
  const message =
    state === 'checking' ? fi.settings.checking : state === 'latest' ? fi.settings.latest : state === 'offline' ? fi.settings.offline : state === 'updating' ? fi.settings.updating : '';

  return (
    <>
      <p className="text-sm font-semibold">{fi.settings.version(APP_VERSION)}</p>
      <p aria-live="polite" className="min-h-5 text-[13px] text-ink-2">
        {message}
      </p>
      <div className="mt-1 grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={state === 'checking' || state === 'updating'}
          onClick={async () => {
            setState('checking');
            setState(await checkForUpdate());
          }}
          className="min-h-11 rounded-xl bg-ink px-3 text-[13px] font-bold text-bg disabled:opacity-60"
        >
          {fi.settings.checkUpdate}
        </button>
        <button
          type="button"
          onClick={() => {
            setState('updating');
            void forceUpdate();
          }}
          className="min-h-11 rounded-xl border border-line px-3 text-[13px] font-bold"
        >
          {fi.settings.forceUpdate}
        </button>
      </div>
      <p className="mt-2 text-xs text-ink-3">{fi.settings.forceHint}</p>
    </>
  );
}
