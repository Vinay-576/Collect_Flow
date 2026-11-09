import React from 'react';
import ReactDOM from 'react-dom/client';
import AccountRouter from './AccountRouter.jsx';
import '../shared/src/index.css';

class DashboardErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('CollectFlow dashboard failed to render.', error, info);
  }

  render() {
    if (this.state.error) {
      return <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: '#100d1b', color: '#f8f6ff', fontFamily: 'system-ui, sans-serif' }}>
        <section style={{ width: '100%', maxWidth: 560, padding: 28, border: '1px solid #3a3150', borderRadius: 20, background: '#19152a' }}>
          <p style={{ color: '#b49aff', fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase' }}>CollectFlow dashboard</p>
          <h1 style={{ margin: '10px 0', fontSize: 22 }}>The dashboard hit an error</h1>
          <p style={{ color: '#c1b9d1', fontSize: 14, lineHeight: 1.6 }}>Refresh the page. If this appears again, share the message below so the error can be fixed.</p>
          <pre style={{ overflowWrap: 'anywhere', whiteSpace: 'pre-wrap', color: '#f6c7d2', fontSize: 12 }}>{String(this.state.error?.message || this.state.error)}</pre>
          <button type="button" onClick={() => window.location.reload()} style={{ marginTop: 12, padding: '10px 16px', border: 0, borderRadius: 999, background: '#7851dd', color: 'white', fontWeight: 700, cursor: 'pointer' }}>Refresh dashboard</button>
        </section>
      </main>;
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <DashboardErrorBoundary>
      <AccountRouter />
    </DashboardErrorBoundary>
  </React.StrictMode>
);
