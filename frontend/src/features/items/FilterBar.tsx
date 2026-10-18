// Tabs for the "what needs my attention" views, plus search and dropdown filters.
// All filtering happens on the server; this component only edits filter state.
import { PRIORITIES, STATUSES } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { humanize } from '../../shared/format';

export type View = 'all' | 'mine' | 'unassigned' | 'urgent';
export interface FilterState { view: View; teamId: string; status: string; priority: string; search: string }

const VIEWS: { id: View; label: string }[] = [
  { id: 'all', label: 'All work' },
  { id: 'mine', label: 'Assigned to me' },
  { id: 'unassigned', label: 'Unassigned' },
  { id: 'urgent', label: 'Urgent' },
];

interface Props { value: FilterState; onChange: (patch: Partial<FilterState>) => void }

export function FilterBar({ value, onChange }: Props) {
  const { profile } = useAuth();
  return (
    <div className="filters">
      <div className="tabs" role="tablist">
        {VIEWS.map((v) => (
          <button key={v.id} role="tab" aria-selected={value.view === v.id}
            className={value.view === v.id ? 'tab active' : 'tab'}
            onClick={() => onChange({ view: v.id })}>{v.label}</button>
        ))}
      </div>
      <input type="search" placeholder="Search title or description…" value={value.search}
        onChange={(e) => onChange({ search: e.target.value })} />
      <div className="selects">
        <select value={value.teamId} onChange={(e) => onChange({ teamId: e.target.value })}>
          <option value="">All my teams</option>
          {profile?.memberships.map((m) => <option key={m.teamId} value={m.teamId}>{m.teamName}</option>)}
        </select>
        <select value={value.status} onChange={(e) => onChange({ status: e.target.value })}>
          <option value="">Any status</option>
          {STATUSES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
        </select>
        {/* The Urgent tab fixes priority, so the dropdown is disabled there. */}
        <select value={value.view === 'urgent' ? 'urgent' : value.priority}
          disabled={value.view === 'urgent'} onChange={(e) => onChange({ priority: e.target.value })}>
          <option value="">Any priority</option>
          {PRIORITIES.map((p) => <option key={p} value={p}>{humanize(p)}</option>)}
        </select>
      </div>
    </div>
  );
}