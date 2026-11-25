import { Link } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { activeFilterCount } from '../domain/filters';
import { selectFilters, useFilters } from '../state/filterStore';
import { useOrigin } from '../state/originStore';
import { fi } from '../i18n/fi';

/**
 * One-line summary of what the app is showing – starting point, area and how many filters are on –
 * that opens the Asetukset tab. The only "settings" control left on the other screens.
 */
export function ScopeLink({ tone = 'plain', section, className = '' }: { tone?: 'plain' | 'onColor'; section?: string; className?: string }) {
  const originName = useOrigin((s) => s.origin.name);
  const filters = useFilters(useShallow(selectFilters));
  const n = activeFilterCount(filters);
  const area = fi.filters.areaLabel(filters.maxDistanceM);
  const style = tone === 'onColor' ? 'bg-white/20 text-white' : 'border border-line bg-surface text-ink';
  return (
    <Link
      to={section ? `/asetukset?osio=${section}` : '/asetukset'}
      aria-label={`${fi.settings.change}: lähtöpiste ${originName}, alue ${area}${n ? `, ${fi.settings.filtersOn(n)}` : ''}`}
      className={`inline-flex min-h-9 max-w-full items-center gap-1.5 rounded-full px-3 text-[13px] font-bold ${style} ${className}`}
    >
      <span className="truncate">
        📍 {originName} · {area}
      </span>
      {n > 0 && <span className="flex-none rounded-full bg-accent px-1.5 text-[11px] text-white">⚙️ {fi.settings.filtersOn(n)}</span>}
      <span aria-hidden className="flex-none opacity-60">
        ›
      </span>
    </Link>
  );
}
