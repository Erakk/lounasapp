import { useToast } from '../state/toastStore';

/** One toast at a time, slid in with CSS (anim-toast in index.css). */
export function ToastHost() {
  const { toast, dismiss } = useToast();
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[calc(150px+env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-[480px] justify-center px-4">
      {toast && (
        <div
          key={toast.id}
          className="anim-toast pointer-events-auto flex w-full items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-bg shadow-card"
        >
          <span className="flex-1">{toast.message}</span>
          {toast.action && (
            <button
              type="button"
              onClick={() => {
                toast.action!.run();
                dismiss();
              }}
              className="rounded-lg px-2 py-1 font-extrabold text-accent-soft underline-offset-2 hover:underline"
            >
              {toast.action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
