import React from 'react';

export default class ErrorBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) return <main role="alert" className="p-6 text-[var(--text-primary)]">
      <h1 className="font-serif text-xl">The calculator could not continue</h1>
      <p className="my-4">{this.state.error.message} Saved records and recovery drafts have not been deleted.</p>
      <button className="underline" onClick={() => window.location.reload()}>Reload calculator</button>
    </main>;
    return this.props.children;
  }
}