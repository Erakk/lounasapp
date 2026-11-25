import { Link, useNavigate, useParams } from 'react-router-dom';
import { usePlace } from '../state/usePlaces';
import { CATEGORIES, tileBg } from '../data/categories';
import { WEEKDAYS } from '../domain/schema';
import { distanceDetail, hoursToday, priceLabel, shortTime } from '../domain/format';
import { isOpenForLunch } from '../domain/openingHours';
import { Badge } from '../components/PlaceCard';
import { VisitPanel } from '../components/VisitPanel';
import { NotesSection } from '../components/NotesSection';
import { usePlaceStats } from '../db/hooks';
import { setFavourite, setHidden } from '../db/repo';
import { useToast } from '../state/toastStore';
import { fi } from '../i18n/fi';

export function PlaceDetailScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const place = usePlace(id);
  const stats = usePlaceStats(id ?? '');
  const showToast = useToast((s) => s.show);


  if (!place) {
    return (
      <div className="p-6">
        <p>{fi.detail.notFound}</p>
        <Link to="/" className="font-bold text-accent-text">
          ← {fi.detail.back}
        </Link>
      </div>
    );
  }

  const now = new Date();
  const cat = CATEGORIES.find((c) => c.id === place.categories[0])!;
  const open = isOpenForLunch(place.lunchHours, now);
  const hours = hoursToday(place, now);
  const quality = place.links.lunchListQuality ?? 'site';
  const routeUrl = `https://www.google.com/maps/dir/?api=1&travelmode=walking&destination=${place.lat},${place.lon}`;

  return (
    <article>
      <div className="relative grid h-[200px] place-items-center text-[86px]" style={{ background: tileBg(cat.tile) }}>
        <span aria-hidden>{cat.emoji}</span>
        <button
          type="button"
          onClick={() => (history.length > 1 ? navigate(-1) : navigate('/'))}
          aria-label={fi.detail.back}
          className="absolute top-4 left-4 grid size-10 place-items-center rounded-[14px] bg-white/85 text-lg text-[#1F2421]"
        >
          ←
        </button>
        <button
          type="button"
          aria-pressed={stats.favourite}
          aria-label={stats.favourite ? fi.prefs.unfavourite : fi.prefs.favourite}
          onClick={() => {
            void setFavourite(place.id, !stats.favourite);
            if (!stats.favourite) showToast(fi.prefs.favAdded);
          }}
          className={`absolute top-4 right-4 grid size-10 place-items-center rounded-[14px] bg-white/85 text-xl ${stats.favourite ? 'text-[#A8283B]' : 'text-[#1F2421]'}`}
        >
          {stats.favourite ? '♥' : '♡'}
        </button>
      </div>

      <div className="relative -mt-6 px-4">
        <div className="rounded-[26px] bg-surface p-[18px] shadow-card">
          <div className="flex flex-wrap gap-1.5">
            {open ? <Badge tone="open">● Lounas auki {hours}</Badge> : hours ? <Badge>Lounas tänään {hours}</Badge> : <Badge>Ei lounasta tänään</Badge>}
            {place.categories.map((c) => (
              <Badge key={c}>{CATEGORIES.find((x) => x.id === c)?.label}</Badge>
            ))}
            {place.status === 'verify' && <Badge tone="warn">{fi.card.verify}</Badge>}
          </div>
          <h1 className="mt-2 font-display text-[26px] leading-tight font-bold">{place.name}</h1>
          <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-ink-2">
            <span>📍 {place.address.replace(', Tampere', '')}</span>
            <span>
              {distanceDetail(place)}
            </span>
          </p>

          {place.links.lunchList && (
            <a
              href={place.links.lunchList}
              target="_blank"
              rel="noreferrer"
              className="mt-3.5 flex h-12 items-center justify-center gap-2 rounded-[14px] border-2 border-ink text-sm font-extrabold"
            >
              📋 {fi.detail.lunchList[quality]} ↗
            </a>
          )}

          <dl className="mt-3.5 grid grid-cols-2 gap-2">
            <Fact label={fi.detail.price} value={priceLabel(place) || '–'} />
            <Fact label={fi.detail.format} value={fi.formats[place.format]} />
            <Fact label={fi.detail.group} value={`Max ~${place.group.comfortMax} hlö`} />
            <Fact
              label={fi.detail.risk}
              value={place.dislikeRisk.reasons.length ? place.dislikeRisk.reasons.map((r) => fi.risks[r]).join(', ') : '–'}
            />
          </dl>

          {place.price.note && <p className="mt-2 text-xs text-ink-2">{place.price.note}</p>}

          {place.includes.length > 0 && (
            <div className="mt-3">
              <h2 className="text-[11px] font-bold tracking-wide text-ink-3 uppercase">{fi.detail.includes}</h2>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {place.includes.map((i) => (
                  <Badge key={i}>{fi.includes[i]}</Badge>
                ))}
              </div>
            </div>
          )}

          <div className="mt-3">
            <h2 className="text-[11px] font-bold tracking-wide text-ink-3 uppercase">{fi.detail.hours}</h2>
            <ul className="mt-1 text-sm">
              {WEEKDAYS.filter((d) => place.lunchHours[d]).map((d) => (
                <li key={d} className="flex justify-between border-b border-line py-1 last:border-0">
                  <span className="text-ink-2">{fi.days[d]}</span>
                  <span>{place.lunchHours[d]!.map((r) => `${shortTime(r.from)}–${shortTime(r.to)}`).join(', ')}</span>
                </li>
              ))}
            </ul>
          </div>

          {place.info.length > 0 && (
            <ul className="mt-3 list-disc pl-5 text-sm text-ink-2">
              {place.info.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          )}

          <div className="mt-4 flex flex-wrap gap-2 text-sm font-bold">
            <a href={routeUrl} target="_blank" rel="noreferrer" className="rounded-xl bg-bg px-3 py-2">
              🧭 {fi.detail.route}
            </a>
            <Link to={`/kartta?paikka=${place.id}`} className="rounded-xl bg-bg px-3 py-2">
              {fi.map.showOnMap}
            </Link>
            {place.links.website && (
              <a href={place.links.website} target="_blank" rel="noreferrer" className="rounded-xl bg-bg px-3 py-2">
                🌐 Verkkosivu
              </a>
            )}
          </div>
        </div>

        <VisitPanel placeId={place.id} placeName={place.name} />
        <NotesSection placeId={place.id} />

        <div className="mt-6 text-center">
          {stats.hidden && <p className="mb-1 text-xs text-ink-2">{fi.prefs.hiddenNote}</p>}
          <button
            type="button"
            onClick={() => {
              void setHidden(place.id, !stats.hidden);
              if (!stats.hidden)
                showToast(fi.prefs.hidden(place.name), { label: fi.visits.undo, run: () => void setHidden(place.id, false) });
            }}
            className="rounded-xl px-3 py-2 text-xs font-bold text-ink-3 hover:text-accent-text"
          >
            {stats.hidden ? fi.prefs.unhide : `🙈 ${fi.prefs.hide}`}
          </button>
        </div>

        <p className="mt-3 mb-4 text-center text-[11px] text-ink-3">Tiedot tarkistettu {place.verifiedAt.split('-').reverse().join('.')}</p>
      </div>
    </article>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-bg px-3 py-2.5">
      <dt className="text-[11px] font-bold tracking-wide text-ink-3 uppercase">{label}</dt>
      <dd className="m-0 text-sm font-bold">{value}</dd>
    </div>
  );
}
