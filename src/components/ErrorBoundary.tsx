import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

/** Catches render errors in a screen so the tab bar keeps working and the user can recover. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('[lounas] screen crashed:', error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="flex min-h-[70vh] flex-col items-center justify-center px-8 text-center">
        <div aria-hidden className="text-5xl">
          🥴
        </div>
        <h1 className="mt-3 font-display text-2xl font-bold">Hups, jotain meni pieleen</h1>
        <p className="mt-2 text-sm text-ink-2">Omat tietosi ovat tallessa. Kokeile ladata sivu uudelleen.</p>
        <div className="mt-5 flex gap-2">
          <button type="button" onClick={() => location.reload()} className="rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-accent-ink">
            Lataa uudelleen
          </button>
          <a href="#/" onClick={() => this.setState({ error: null })} className="rounded-xl border border-line px-4 py-2.5 text-sm font-bold">
            Etusivulle
          </a>
        </div>
      </div>
    );
  }
}
