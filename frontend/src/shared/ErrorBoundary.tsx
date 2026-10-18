// Last line of defence: a render crash shows a recovery screen instead of a blank page.
import { Component, type ReactNode } from 'react';

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(err: unknown) { console.error('[ui] render error', err); }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="center">
        <h2>Something went wrong</h2>
        <button onClick={() => location.reload()}>Reload</button>
      </div>
    );
  }
}