// Typed wrappers around the work-item endpoints. Components never build URLs by hand.
import { api } from './client';
import type { ActivityEntry, Page, WorkItem } from './types';

export interface ListFilters {
  teamId?: string;
  status?: string;
  priority?: string;
  assignee?: string; // 'me' | 'unassigned' | user id
  q?: string;
}

export const listItems = (f: ListFilters, cursor?: string) =>
  api<Page<WorkItem>>('/work-items', { query: { ...f, limit: 25, cursor } });

export const getItem = (id: string) => api<WorkItem>(`/work-items/${id}`);

// The idempotency key is generated once per "create" attempt, so a retry of the
// same attempt can be recognised by the server (backend support arrives in Phase 3).
export const createItem = (
  body: { teamId: string; title: string; description: string; priority: string },
  idempotencyKey: string,
) => api<WorkItem>('/work-items', { method: 'POST', body, headers: { 'Idempotency-Key': idempotencyKey } });

// expectedVersion is the version the user's edit was based on. The server rejects with 409 if it moved on.
export const updateItem = (
  id: string,
  body: { expectedVersion: number; title?: string; description?: string },
) => api<WorkItem>(`/work-items/${id}`, { method: 'PATCH', body });

export const listActivity = (id: string, cursor?: string) =>
  api<Page<ActivityEntry>>(`/work-items/${id}/activity`, { query: { limit: 20, cursor } });