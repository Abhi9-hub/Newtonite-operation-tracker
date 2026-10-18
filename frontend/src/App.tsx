// Top-level layout. Owns the UI state: filters, selected item, create modal.
import { useMemo, useState } from 'react';
import type { ListFilters } from './api/workItems';
import { useAuth } from './auth/AuthContext';
import { LoginPage } from './features/auth/LoginPage';
import { CreateItemModal } from './features/items/CreateItemModal';
import { FilterBar, type FilterState } from './features/items/FilterBar';
import { ItemDetail } from './features/items/ItemDetail';
import { ItemList } from './features/items/ItemList';
import { useDebounce } from './shared/useDebounce';

function Workspace() {
  const { profile, logout } = useAuth();
  const [f, setF] = useState<FilterState>({ view: 'all', teamId: '', status: '', priority: '', search: '' });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const search = useDebounce(f.search, 300); // do not query on every keystroke

  // UI state -> server-side filters. The tab views are just presets of these.
  const filters = useMemo<ListFilters>(() => ({
    teamId: f.teamId || undefined,
    status: f.status || undefined,
    priority: f.view === 'urgent' ? 'urgent' : f.priority || undefined,
    assignee: f.view === 'mine' ? 'me' : f.view === 'unassigned' ? 'unassigned' : undefined,
    q: search.trim() || undefined,
  }), [f.teamId, f.status, f.priority, f.view, search]);

  const canCreate = profile?.memberships.some((m) => m.role !== 'viewer') ?? false;

  return (
    <div className="app">
      <header>
        <strong>Ops Tracker</strong>
        <span className="spacer" />
        <button className="primary" disabled={!canCreate} onClick={() => setCreating(true)}
          title={canCreate ? '' : 'You are a viewer in all your teams'}>+ New item</button>
        <span className="muted">{profile?.name}</span>
        <button onClick={logout}>Log out</button>
      </header>

      {/* On small screens the list hides while an item is open (see .has-selection in CSS). */}
      <div className={selectedId ? 'layout has-selection' : 'layout'}>
        <aside className="list-pane">
          <FilterBar value={f} onChange={(patch) => setF((s) => ({ ...s, ...patch }))} />
          <ItemList filters={filters} selectedId={selectedId} onSelect={setSelectedId} />
        </aside>
        <main className="detail-pane">
          {selectedId
            ? <ItemDetail id={selectedId} onBack={() => setSelectedId(null)} />
            : <p className="muted pad">Select a work item to see its details and history.</p>}
        </main>
      </div>

      {creating && (
        <CreateItemModal onClose={() => setCreating(false)}
          onCreated={(item) => { setCreating(false); setSelectedId(item.id); }} />
      )}
    </div>
  );
}

export default function App() {
  const { profile, loading } = useAuth();
  if (loading) return <div className="center muted">Loading…</div>;
  return profile ? <Workspace /> : <LoginPage />;
}