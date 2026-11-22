import { NavLink } from 'react-router-dom';
import { fi } from '../i18n/fi';

const TABS = [
  { to: '/', label: fi.tabs.search, icon: '🔍', end: true },
  { to: '/kartta', label: fi.tabs.map, icon: '🗺️', end: false },
  { to: '/arvo', label: fi.tabs.random, icon: '🎲', end: false },
  { to: '/omat', label: fi.tabs.mine, icon: '⭐', end: false },
];

export function TabBar() {
  return (
    <nav
      aria-label="Päävalikko"
      className="fixed inset-x-0 bottom-0 z-20 mx-auto grid max-w-[480px] grid-cols-4 border-t border-line bg-surface px-2 pt-2 pb-[calc(10px+env(safe-area-inset-bottom))]"
    >
      {TABS.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.end}
          className={({ isActive }) =>
            `flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-bold transition-colors ${
              isActive ? 'text-accent-text' : 'text-ink-3 hover:text-ink-2'
            }`
          }
        >
          <span aria-hidden className="text-xl leading-none">
            {t.icon}
          </span>
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
}
