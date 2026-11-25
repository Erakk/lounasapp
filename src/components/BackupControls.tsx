import { useRef } from 'react';
import { useAllNotes, useAllVisits } from '../db/hooks';
import { clearAll, exportAll, importBackup, parseBackup } from '../db/repo';
import { useToast } from '../state/toastStore';
import { fi } from '../i18n/fi';

/** Own data on this phone: download a backup, restore one (merged with what's there), or delete everything. */
export function BackupControls() {
  const visits = useAllVisits();
  const notes = useAllNotes();
  const showToast = useToast((s) => s.show);
  const fileRef = useRef<HTMLInputElement>(null);

  const onExport = async () => {
    const backup = await exportAll();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lounas-varmuuskopio-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast(fi.mine.exported);
  };

  const onImportFile = async (file: File) => {
    try {
      const backup = parseBackup(await file.text());
      if (!window.confirm(fi.mine.importConfirm(backup.visits.length, backup.notes.length))) return;
      const c = await importBackup(backup);
      showToast(fi.mine.imported(c.visits, c.notes));
    } catch (e) {
      showToast((e as Error).message);
    }
  };

  const onClear = async () => {
    if (!window.confirm(fi.mine.clearConfirm)) return;
    await clearAll();
    showToast(fi.mine.cleared);
  };

  return (
    <>
      <p className="mb-2.5 text-[13px] text-ink-2">
        {fi.mine.subtitle} {fi.mine.stored(visits.length, notes.length)}
      </p>
      <div className="flex flex-col gap-2">
        <button type="button" onClick={() => void onExport()} className="min-h-11 rounded-xl bg-ink px-4 text-sm font-bold text-bg">
          ⬇️ {fi.mine.export}
        </button>
        <button type="button" onClick={() => fileRef.current?.click()} className="min-h-11 rounded-xl border border-line px-4 text-sm font-bold">
          ⬆️ {fi.mine.import}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) void onImportFile(file);
          }}
        />
      </div>
      <p className="mt-2 text-xs text-ink-3">{fi.mine.backupHint}</p>
      <button type="button" onClick={() => void onClear()} className="mt-3 min-h-11 w-full rounded-xl text-[13px] font-bold text-accent-text">
        🗑️ {fi.mine.clear}
      </button>
    </>
  );
}
