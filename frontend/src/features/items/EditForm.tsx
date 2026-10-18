// Edit form with optimistic locking and optimistic UI.
//  - base:  the server version this draft is based on (its version is sent as expectedVersion)
//  - draft: what the user has typed
//  - item:  the latest server copy from the query cache (refreshed by polling)
import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../../api/client';
import type { WorkItem } from '../../api/types';
import { updateItem } from '../../api/workItems';
import { useToast } from '../../shared/toast';
import { ConflictPanel } from './ConflictPanel';

interface Base { title: string; description: string; version: number }
const fromItem = (i: WorkItem): Base => ({ title: i.title, description: i.description, version: i.version });

export function EditForm({ item, canEdit }: { item: WorkItem; canEdit: boolean }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [base, setBase] = useState<Base>(fromItem(item));
  const [draft, setDraft] = useState({ title: item.title, description: item.description });
  const [conflict, setConflict] = useState<WorkItem | null>(null);

  const dirty = draft.title !== base.title || draft.description !== base.description;
  const stale = item.version !== base.version; // server moved on since this draft started

  // If the user has no unsaved edits, silently follow the latest server copy.
  useEffect(() => {
    if (!dirty && item.version !== base.version) {
      setBase(fromItem(item));
      setDraft({ title: item.title, description: item.description });
    }
  }, [item, dirty, base.version]);

  const save = useMutation({
    mutationFn: () => updateItem(item.id, {
      expectedVersion: base.version,
      title: draft.title.trim(),
      description: draft.description,
    }),
    // Optimistic: show the edit immediately. The server still has the final say.
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ['item', item.id] }); // stop in-flight polls overwriting it
      const previous = qc.getQueryData<WorkItem>(['item', item.id]);
      qc.setQueryData<WorkItem>(['item', item.id], (old) =>
        old && { ...old, title: draft.title.trim(), description: draft.description });
      return { previous };
    },
    onError: (err, _vars, ctx) => {
      if (err instanceof ApiError && err.code === 'VERSION_CONFLICT') {
        // Reconcile: the server's current state replaces our optimistic guess.
        const current = (err.details as { current: WorkItem }).current;
        qc.setQueryData(['item', item.id], current);
        setConflict(current);
      } else {
        if (ctx?.previous) qc.setQueryData(['item', item.id], ctx.previous); // roll back
        toast.error(err); // 403, 404, network, ...
      }
    },
    onSuccess: (saved) => {
      qc.setQueryData(['item', item.id], saved);
      setBase(fromItem(saved));
      setDraft({ title: saved.title, description: saved.description });
      toast.push('success', 'Saved');
      qc.invalidateQueries({ queryKey: ['items'] });            // list order/titles changed
      qc.invalidateQueries({ queryKey: ['activity', item.id] }); // new history row
    },
  });

  const useLatest = () => {
    if (!conflict) return;
    setBase(fromItem(conflict));
    setDraft({ title: conflict.title, description: conflict.description });
    setConflict(null);
  };
  // Rebase: keep my text, but now claim to be based on the latest version, so the next Save can succeed.
  const keepMine = () => {
    if (!conflict) return;
    setBase(fromItem(conflict));
    setConflict(null);
  };

  const readOnly = !canEdit;
  return (
    <form className="edit" onSubmit={(e) => { e.preventDefault(); if (!save.isPending) save.mutate(); }}>
      {readOnly && <p className="muted">You have read-only access to this item.</p>}

      {/* Warn before the user hits a 409: someone changed the item while they were editing. */}
      {stale && dirty && !conflict && (
        <div className="stale" role="status">
          This item was updated by someone else while you were editing (now version {item.version}).{' '}
          <button type="button" className="link" onClick={() => setConflict(item)}>Review changes</button>
        </div>
      )}
      {conflict && <ConflictPanel draft={draft} theirs={conflict} onUseLatest={useLatest} onKeepMine={keepMine} />}

      <label>Title
        <input value={draft.title} readOnly={readOnly} maxLength={200}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
      </label>
      <label>Description
        <textarea rows={5} value={draft.description} readOnly={readOnly}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
      </label>

      {!readOnly && (
        <div className="actions">
          <button type="button" disabled={!dirty || save.isPending}
            onClick={() => setDraft({ title: base.title, description: base.description })}>Reset</button>
          <button className="primary" disabled={!dirty || save.isPending || !draft.title.trim() || !!conflict}>
            {save.isPending ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      )}
    </form>
  );
}