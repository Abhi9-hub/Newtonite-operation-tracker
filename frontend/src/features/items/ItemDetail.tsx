// Right-hand panel: item header, edit form, and history.
import { useQuery } from '@tanstack/react-query';
import { getItem } from '../../api/workItems';
import { useAuth } from '../../auth/AuthContext';
import { Badge } from '../../shared/Badge';
import { timeAgo } from '../../shared/format';
import { ActivityTimeline } from './ActivityTimeline';
import { EditForm } from './EditForm';

export function ItemDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const { profile, roleIn } = useAuth();
  const q = useQuery({
    queryKey: ['item', id],
    queryFn: () => getItem(id),
    refetchInterval: 15_000, // pick up other users' changes (also refetches on window focus)
  });

  const back = <button className="back" onClick={onBack}>← Back</button>;

  if (q.isPending) return <div className="pad">{back}<p className="muted">Loading…</p></div>;
  if (q.isError) {
    // 404 covers both "deleted" and "you have no access" (the server hides which).
    return (
      <div className="pad">
        {back}
        <p className="error">{q.error.message}</p>
        <button onClick={() => q.refetch()}>Retry</button>
      </div>
    );
  }

  const item = q.data;
  const role = roleIn(item.teamId);
  const team = profile?.memberships.find((m) => m.teamId === item.teamId)?.teamName;
  const canEdit = role === 'member' || role === 'lead';

  return (
    <div className="pad detail">
      {back}
      <h2>{item.title}</h2>
      <div className="meta">
        <Badge kind="priority" value={item.priority} />
        <Badge kind="status" value={item.status} />
        <span className="muted">
          {team} · your role: {role} · {item.assigneeName ? `assigned to ${item.assigneeName}` : 'unassigned'} · version {item.version} · updated {timeAgo(item.updatedAt)}
        </span>
      </div>
      {/* key={id}: switching items fully resets the edit form's local state */}
      <EditForm key={item.id} item={item} canEdit={canEdit} />
      <ActivityTimeline itemId={item.id} />
    </div>
  );
}