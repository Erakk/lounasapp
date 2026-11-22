import { CATEGORIES, tileBg, type CategoryId } from '../data/categories';
import { GRID_IDS } from './CategoryGrid';

/** Compact, horizontally scrolling version of the category grid (same categories, same shared selection). */
export function CategoryChips({ selected, onToggle }: { selected: CategoryId[]; onToggle: (id: CategoryId) => void }) {
  return (
    <div className="no-scrollbar -mx-3 flex gap-1.5 overflow-x-auto px-3 pb-0.5" role="group" aria-label="Kategoriat">
      {GRID_IDS.map((id) => {
        const c = CATEGORIES.find((x) => x.id === id)!;
        const on = selected.includes(id);
        return (
          <button
            key={id}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(id)}
            style={on ? undefined : { background: tileBg(c.tile) }}
            className={`inline-flex min-h-9 flex-none items-center gap-1 rounded-full border px-3 text-[12.5px] font-semibold whitespace-nowrap ${
              on ? 'border-ink bg-ink text-bg' : 'border-transparent text-ink'
            }`}
          >
            <span aria-hidden>{c.emoji}</span> {c.label}
          </button>
        );
      })}
    </div>
  );
}
