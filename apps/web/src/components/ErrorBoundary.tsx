import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Optional replacement UI; defaults to a small inline error card. */
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Last line of defence: one malformed message should never white-screen the
 * whole page. The boundary replaces the failed view with a retry card.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unhandled UI error', error, info.componentStack);
  }

  private reset = () => this.setState({ error: null });

  render(): ReactNode {
    if (!this.state.error) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <div
        role="alert"
        className="m-6 rounded-xl border border-badge/40 bg-badge/10 p-4 text-[13px] text-content"
      >
        <p className="font-semibold">Something went wrong while rendering this view.</p>
        <p className="mt-1 text-muted">{this.state.error.message}</p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={this.reset}
            className="rounded-lg bg-accent px-3 py-1.5 text-[12px] font-semibold text-ink"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg border border-line px-3 py-1.5 text-[12px] text-muted transition hover:text-content"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}
