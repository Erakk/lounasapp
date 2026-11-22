import { CATEGORIES, tileBg, type CategoryId } from '../data/categories';
import { fi } from '../i18n/fi';

// Asian subcategories are reachable through filters later; the grid shows the umbrella tile.
export const GRID_IDS: CategoryId[] = [
  'kotiruoka', 'aasia', 'intia', 'burger', 'pizza', 'valimeri', 'kebab', 'buffet', 'bistro', 'kahvila', 'vege', 'keitto',
];

interface Props {
  counts: Map<CategoryId, number>;
  selected: CategoryId[];
  onToggle: (id: CategoryId) => void;
}

export function CategoryGrid({ counts, selected, onToggle }: Props) {
  return (
    <div className="grid grid-cols-3 gap-2.5">
      {GRID_IDS.map((id) => {
        const c = CATEGORIES.find((x) => x.id === id)!;
        const on = selected.includes(id);
        return (
          <button
            key={id}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(id)}
            style={{ background: tileBg(c.tile) }}
            className={`relative flex min-h-[92px] flex-col justify-between rounded-tile border-2 p-2.5 pt-3 text-left transition-transform active:scale-[.97] ${
              on ? 'scale-[1.02] border-accent shadow-card' : 'border-transparent'
            }`}
          >
            <span aria-hidden className="text-[28px] leading-none">
              {c.emoji}
            </span>
            <span>
              <span className="block text-[13px] leading-tight font-bold text-ink">{c.label}</span>{' '}
              <span className="text-[11px] font-semibold text-ink-2">{fi.home.places(counts.get(id) ?? 0)}</span>
            </span>
            {on && (
              <span className="absolute top-2 right-2.5 grid size-5 place-items-center rounded-full bg-accent text-xs font-extrabold text-white">
                ✓
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
