// ============================================================
// ChampIndex — Error Boundary
// Empêche un crash composant de tuer toute l'app
// ============================================================

import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-8">
          <span className="material-symbols-outlined !text-5xl text-danger" aria-hidden="true">error</span>
          <h2 className="text-lg font-medium font-display text-ink">Oups, quelque chose a planté</h2>
          <p className="text-sm text-ink-soft text-center max-w-sm">
            Une erreur inattendue s'est produite. Vos données (favoris, notes) sont en sécurité.
          </p>
          {this.state.error && (
            <pre className="text-[10px] text-danger bg-danger-wash px-3 py-2 rounded-lg max-w-sm overflow-auto max-h-24">
              {this.state.error.message}
            </pre>
          )}
          <div className="flex gap-3 mt-2">
            <button
              onClick={this.handleReset}
              className="px-5 py-2.5 rounded-xl bg-moss text-paper text-sm font-medium
                hover:bg-moss-deep transition-colors"
            >
              Réessayer
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-xl bg-paper-raised border border-line-strong text-ink text-sm
                hover:bg-paper-deep transition-colors"
            >
              Recharger l'app
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
