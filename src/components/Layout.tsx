import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { TabBar } from './TabBar';
import { ToastHost } from './ToastHost';
import { ErrorBoundary } from './ErrorBoundary';
import { applyTheme, useTheme } from '../state/themeStore';

/** Phone-first shell: content column (max 480 px on desktop) + fixed bottom tab bar. */
export function Layout() {
  const { pathname } = useLocation();
  const theme = useTheme((s) => s.theme);

  // Every page except the home list opens at the top. The list keeps its scroll so "back" returns you where you were.
  useEffect(() => {
    if (pathname !== '/') window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    applyTheme(theme);
    if (theme !== 'auto') return;
    // Follow the phone's light/dark setting live while on "auto".
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('auto');
    mq?.addEventListener?.('change', onChange);
    return () => mq?.removeEventListener?.('change', onChange);
  }, [theme]);

  return (
    <div className="mx-auto flex min-h-full max-w-[480px] flex-col bg-bg">
      <main className="flex-1 pb-[calc(84px+env(safe-area-inset-bottom))]">
        {/* Keyed by path: navigating away from a crashed screen resets the boundary. */}
        <ErrorBoundary key={pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>
      <ToastHost />
      <TabBar />
    </div>
  );
}
