import { Link } from 'react-router-dom';
import type { Place } from '../domain/schema';
import { CATEGORIES, tileBg } from '../data/categories';
import { distanceLabel, hoursToday, priceLabel } from '../domain/format';
import { isOpenForLunch } from '../domain/openingHours';
import { fi } from '../i18n/fi';
import { relativeDay, type PlaceStats } from '../domain/stats';

export function PlaceCard({ place, now, stats }: { place: Place; now: Date; stats?: PlaceStats }) {
  const cat = CATEGORIES.find((c) => c.id === place.categories[0])!;
  const open = isOpenForLunch(place.lunchHours, now);
  const hours = hoursToday(place, now);
  const price = priceLabel(place);
  // All categories except "buffet", which has its own badge.
  const catLabels = place.categories
    .filter((c) => c !== 'buffet')
    .map((c) => CATEGORIES.find((x) => x.id === c)!.label)
    .join(' · ');
  const hasBuffet = place.format === 'buffet' || place.categories.includes('buffet');

  return (
    <div className="relative grid grid-cols-[56px_1fr_auto] items-center gap-3 rounded-[var(--radius-card)] bg-surface p-3.5 shadow-card">
      <div aria-hidden className="grid size-14 place-items-center rounded-2xl text-[28px]" style={{ background: tileBg(cat.tile) }}>
        {cat.emoji}
      </div>
      <div className="min-w-0">
        {/* Whole card is clickable via this stretched link */}
        <Link to={`/paikka/${place.id}`} className="block truncate text-[15px] font-extrabold after:absolute after:inset-0 after:rounded-[var(--radius-card)]">
          {stats?.favourite && (
            <span aria-label="Suosikki" className="mr-1 text-accent-text">
              ♥
            </span>
          )}
          {place.name}
        </Link>
        <div className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-ink-2">
          <span>{distanceLabel(place)}</span>
          {catLabels && <span>{catLabels}</span>}
          {hours && <span>{hours}</span>}
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {open && <Badge tone="open">{fi.card.openNow}</Badge>}
          {stats && stats.visitCount > 0 && (
            <Badge tone="mine">
              {fi.visits.badge(stats.visitCount)}
              {stats.lastVisited ? ` · ${relativeDay(stats.lastVisited)}` : ''}
            </Badge>
          )}
          {stats?.avgStars !== undefined && <Badge tone="mine">★ {stats.avgStars.toLocaleString('fi-FI')}</Badge>}
          {place.status === 'verify' && <Badge tone="warn">{fi.card.verify}</Badge>}
          {hasBuffet && <Badge>Buffet</Badge>}
          {place.diet.includes('vegan') && <Badge>Vegaani ok</Badge>}
          {place.group.comfortMax >= 10 && <Badge>Iso ryhmä ok</Badge>}
        </div>
      </div>
      <div className="relative z-10 flex flex-col items-end gap-1.5">
        {price && <b className="text-[15px] font-extrabold whitespace-nowrap">{price}</b>}
        {place.links.lunchList && (
          <a
            href={place.links.lunchList}
            target="_blank"
            rel="noreferrer"
            aria-label={`${place.name}: ${fi.detail.lunchList[place.links.lunchListQuality ?? 'site']}`}
            title={fi.detail.lunchList[place.links.lunchListQuality ?? 'site']}
            className="grid size-9 place-items-center rounded-xl border border-line bg-surface text-[15px] hover:border-ink-3"
          >
            📋
          </a>
        )}
      </div>
    </div>
  );
}

export function Badge({ children, tone }: { children: React.ReactNode; tone?: 'open' | 'warn' | 'mine' }) {
  const cls =
    tone === 'open'
      ? 'bg-sage-soft text-sage-ink'
      : tone === 'warn'
        ? 'bg-[#FDF0D5] text-[#8A5A00]'
        : tone === 'mine'
          ? 'bg-accent-soft text-accent-text'
          : 'bg-bg text-ink-2';
  return <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold ${cls}`}>{children}</span>;
}
