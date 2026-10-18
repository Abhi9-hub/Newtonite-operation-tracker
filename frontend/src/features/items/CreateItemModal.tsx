// Modal for creating an item. Only teams where the user can create (member/lead) are offered.
import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PRIORITIES, type WorkItem } from '../../api/types';
import { createItem } from '../../api/workItems';
import { useAuth } from '../../auth/AuthContext';
import { humanize } from '../../shared/format';
import { useToast } from '../../shared/toast';

interface Props { onClose: () => void; onCreated: (item: WorkItem) => void }

export function CreateItemModal({ onClose, onCreated }: Props) {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const teams = (profile?.memberships ?? []).filter((m) => m.role !== 'viewer');

  const [teamId, setTeamId] = useState(teams[0]?.teamId ?? '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  // One key per modal session: if the user retries the same submit, the server can recognise it.
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const create = useMutation({
    mutationFn: () => createItem({ teamId, title: title.trim(), description, priority }, idempotencyKey),
    onSuccess: (item) => {
      qc.invalidateQueries({ queryKey: ['items'] });
      toast.push('success', 'Work item created');
      onCreated(item);
    },
    onError: (err) => toast.error(err),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!create.isPending) create.mutate(); // ignore repeat clicks while in flight
  };

  return (
    <div className="backdrop" onClick={onClose}>
      <form className="card modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2>New work item</h2>
        <label>Team
          <select value={teamId} onChange={(e) => setTeamId(e.target.value)}>
            {teams.map((t) => <option key={t.teamId} value={t.teamId}>{t.teamName} ({t.role})</option>)}
          </select>
        </label>
        <label>Title<input value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} autoFocus required /></label>
        <label>Description<textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} /></label>
        <label>Priority
          <select value={priority} onChange={(e) => setPriority(e.target.value)}>
            {PRIORITIES.map((p) => <option key={p} value={p}>{humanize(p)}</option>)}
          </select>
        </label>
        <div className="actions">
          <button type="button" onClick={onClose}>Cancel</button>
          <button className="primary" disabled={create.isPending || !title.trim() || !teamId}>
            {create.isPending ? 'Creating…' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  );
}