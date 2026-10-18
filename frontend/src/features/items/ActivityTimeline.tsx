// Newest-first history of an item, paginated. Renders every change as "field: before -> after".
import { useInfiniteQuery } from '@tanstack/react-query';
import { listActivity } from '../../api/workItems';
import { humanize, timeAgo } from '../../shared/format';

// Compact display of a JSON value inside a diff line.
const fmt = (v: unknown) => {
  if (v === null || v === undefined) return '—';
  const s = typeof v === 'string' ? v : JSON.stringify(v);
  return s.length > 80 ? s.slice(0, 80) + '…' : s;
};

export function ActivityTimeline({ itemId }: { itemId: string }) {
  const q = useInfiniteQuery({
    queryKey: ['activity', itemId],
    queryFn: ({ pageParam }) => listActivity(itemId, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    refetchInterval: 15_000,
  });

  const entries = q.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <section className="timeline">
      <h3>History</h3>
      {q.isPending && <p className="muted">Loading history…</p>}
      {q.isError && <p className="error">{q.error.message} <button onClick={() => q.refetch()}>Retry</button></p>}
      <ol>
        {entries.map((e) => {
          const keys = Array.from(new Set([...Object.keys(e.before ?? {}), ...Object.keys(e.after ?? {})]));
          return (
            <li key={e.id}>
              <div><strong>{e.actor.name}</strong> {humanize(e.type).toLowerCase()} <span className="muted">· {timeAgo(e.createdAt)}</span></div>
              {keys.map((k) => (
                <div key={k} className="diffline">
                  {k}: {e.before && k in e.before && <><s>{fmt(e.before[k])}</s> → </>}{fmt(e.after?.[k])}
                </div>
              ))}
            </li>
          );
        })}
      </ol>
      {q.hasNextPage && (
        <button disabled={q.isFetchingNextPage} onClick={() => q.fetchNextPage()}>Load older</button>
      )}
    </section>
  );
}