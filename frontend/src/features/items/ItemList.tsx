// Paginated list of items. Loads one page at a time via the server's cursor,
// so the browser never holds the whole dataset.
import { useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { listItems, type ListFilters } from '../../api/workItems';
import { Badge } from '../../shared/Badge';
import { timeAgo } from '../../shared/format';

interface Props { filters: ListFilters; selectedId: string | null; onSelect: (id: string) => void }

export function ItemList({ filters, selectedId, onSelect }: Props) {
  const q = useInfiniteQuery({
    queryKey: ['items', filters], // changing any filter = a fresh query with its own cache entry
    queryFn: ({ pageParam }) => listItems(filters, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    refetchInterval: 30_000, // keep the overview reasonably fresh without websockets
  });

  // Flatten pages and de-duplicate by id (an item can move between pages after a refetch).
  const items = useMemo(() => {
    const seen = new Set<string>();
    return (q.data?.pages.flatMap((p) => p.items) ?? []).filter((i) => !seen.has(i.id) && seen.add(i.id));
  }, [q.data]);

  if (q.isPending) return <p className="muted pad">Loading…</p>;
  if (q.isError) {
    return (
      <div className="pad">
        <p className="error">{q.error.message}</p>
        <button onClick={() => q.refetch()}>Retry</button>
      </div>
    );
  }
  if (items.length === 0) return <p className="muted pad">No work items match these filters.</p>;

  return (
    <>
      <ul className="items">
        {items.map((i) => (
          <li key={i.id}>
            <button className={i.id === selectedId ? 'row selected' : 'row'} onClick={() => onSelect(i.id)}>
              <span className="row-title">{i.title}</span>
              <span className="row-meta">
                <Badge kind="priority" value={i.priority} />
                <Badge kind="status" value={i.status} />
                <span className="muted">{i.assigneeName ?? 'Unassigned'} · {timeAgo(i.updatedAt)}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {q.hasNextPage && (
        <button className="more" disabled={q.isFetchingNextPage} onClick={() => q.fetchNextPage()}>
          {q.isFetchingNextPage ? 'Loading…' : 'Load more'}
        </button>
      )}
    </>
  );
}