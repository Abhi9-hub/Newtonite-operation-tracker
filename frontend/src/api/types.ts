// Shapes returned by the backend. Mirrors the DTOs in work-items.service.ts.
export type Role = 'viewer' | 'member' | 'lead';

export const STATUSES = ['open', 'in_progress', 'in_review', 'resolved'] as const;
export const PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;

export interface Membership { teamId: string; teamName: string; role: Role }
export interface Profile { id: string; email: string; name: string; memberships: Membership[] }

export interface WorkItem {
  id: string;
  teamId: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assigneeId: string | null;
  assigneeName: string | null;
  version: number; // optimistic-lock counter; sent back as expectedVersion on edits
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityEntry {
  id: string;
  type: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  createdAt: string;
  actor: { id: string; name: string };
}

// Every paginated endpoint returns this shape.
export interface Page<T> { items: T[]; nextCursor: string | null }