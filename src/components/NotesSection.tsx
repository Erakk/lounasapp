import { useState } from 'react';
import type { Note } from '../db/db';
import { addNote, deleteNote, updateNote } from '../db/repo';
import { useNotes } from '../db/hooks';
import { formatDate } from '../domain/stats';
import { useToast } from '../state/toastStore';
import { fi } from '../i18n/fi';

export const QUICK_TAGS = ['Hyvä hinta', 'Iso annos', 'Nopea', 'Jonoa', 'Hyvä kasvis', 'Sopii ryhmälle', 'Rauhallinen', 'Meluisa'];

type Draft = Pick<Note, 'text' | 'stars' | 'tags'>;
const EMPTY: Draft = { text: '', stars: undefined, tags: [] };

export function NotesSection({ placeId }: { placeId: string }) {
  const notes = useNotes(placeId);
  const showToast = useToast((s) => s.show);
  const [editing, setEditing] = useState<string | 'new' | null>(null);

  const save = async (draft: Draft) => {
    if (editing === 'new') await addNote(placeId, draft);
    else if (editing) await updateNote(editing, draft);
    setEditing(null);
    showToast(fi.notes.saved);
  };

  const remove = async (n: Note) => {
    await deleteNote(n.id);
    showToast(fi.notes.deleted, {
      label: fi.visits.undo,
      run: () => void addNote(placeId, { text: n.text, stars: n.stars, tags: n.tags }),
    });
  };

  return (
    <section className="mt-5">
      <div className="mb-2.5 flex items-center justify-between">
        <h2 className="text-base font-extrabold">{fi.notes.title}</h2>
        {editing === null && (
          <button type="button" onClick={() => setEditing('new')} className="text-[13px] font-bold text-accent-text">
            + {fi.notes.add}
          </button>
        )}
      </div>

      {editing === 'new' && <NoteForm initial={EMPTY} onSave={save} onCancel={() => setEditing(null)} />}

      {notes.length === 0 && editing === null && <p className="rounded-2xl bg-surface p-4 text-sm text-ink-2 shadow-card">{fi.notes.empty}</p>}

      <ul className="flex flex-col gap-2">
        {notes.map((n) =>
          editing === n.id ? (
            <li key={n.id}>
              <NoteForm initial={n} onSave={save} onCancel={() => setEditing(null)} />
            </li>
          ) : (
            <li key={n.id} className="rounded-[18px] bg-surface px-3.5 py-3 text-sm shadow-card">
              <div className="flex items-center justify-between">
                <span className="text-[13px] tracking-[1px] text-amber" aria-label={n.stars ? `${n.stars} / 5` : undefined}>
                  {n.stars ? '★'.repeat(n.stars) + '☆'.repeat(5 - n.stars) : ''}
                </span>
                <span className="text-[11px] font-semibold text-ink-3">{formatDate(n.date)}</span>
              </div>
              {n.text && <p className="mt-1 whitespace-pre-wrap">{n.text}</p>}
              {n.tags.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {n.tags.map((t) => (
                    <span key={t} className="rounded-full bg-bg px-2 py-0.5 text-[10.5px] font-bold text-ink-2">
                      {t}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-2 flex gap-3 text-xs font-bold">
                <button type="button" onClick={() => setEditing(n.id)} className="text-ink-2 hover:text-ink">
                  {fi.notes.edit}
                </button>
                <button type="button" onClick={() => void remove(n)} className="text-ink-3 hover:text-accent-text">
                  {fi.notes.delete}
                </button>
              </div>
            </li>
          ),
        )}
      </ul>
    </section>
  );
}

function NoteForm({ initial, onSave, onCancel }: { initial: Draft; onSave: (d: Draft) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState<Draft>({ text: initial.text, stars: initial.stars, tags: [...initial.tags] });
  const canSave = draft.text.trim().length > 0 || draft.stars !== undefined || draft.tags.length > 0;
  const toggleTag = (t: string) =>
    setDraft((d) => ({ ...d, tags: d.tags.includes(t) ? d.tags.filter((x) => x !== t) : [...d.tags, t] }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (canSave) onSave(draft);
      }}
      className="mb-2 rounded-[18px] bg-surface p-3.5 shadow-card"
    >
      <div role="radiogroup" aria-label={fi.notes.stars} className="flex gap-1">
        {([1, 2, 3, 4, 5] as const).map((s) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={draft.stars === s}
            aria-label={`${s} / 5`}
            onClick={() => setDraft((d) => ({ ...d, stars: d.stars === s ? undefined : s }))}
            className={`grid size-10 place-items-center rounded-xl text-2xl ${draft.stars && s <= draft.stars ? 'text-amber' : 'text-line'}`}
          >
            ★
          </button>
        ))}
      </div>
      <label className="mt-2 block">
        <span className="sr-only">{fi.notes.text}</span>
        <textarea
          value={draft.text}
          onChange={(e) => setDraft((d) => ({ ...d, text: e.target.value }))}
          placeholder={fi.notes.placeholder}
          rows={3}
          maxLength={1000}
          className="w-full resize-y rounded-xl border border-line bg-bg p-2.5 text-sm outline-none focus:border-ink-3"
        />
      </label>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {QUICK_TAGS.map((t) => {
          const on = draft.tags.includes(t);
          return (
            <button
              key={t}
              type="button"
              aria-pressed={on}
              onClick={() => toggleTag(t)}
              className={`min-h-8 rounded-full border px-2.5 text-xs font-semibold ${on ? 'border-ink bg-ink text-bg' : 'border-line text-ink-2'}`}
            >
              {t}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-xl px-3 py-2 text-sm font-bold text-ink-2">
          {fi.notes.cancel}
        </button>
        <button type="submit" disabled={!canSave} className="rounded-xl bg-accent px-4 py-2 text-sm font-extrabold text-accent-ink disabled:opacity-40">
          {fi.notes.save}
        </button>
      </div>
    </form>
  );
}
