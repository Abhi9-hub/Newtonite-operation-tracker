// The permission model as plain data + one pure function.
// No database or Express in this file, so the whole matrix is trivially unit-testable.
export type Role = 'viewer' | 'member' | 'lead';

export type Action =
  | 'item:read'
  | 'item:create'
  | 'item:edit'
  | 'item:comment'
  | 'item:claim'            // take responsibility for an unassigned item
  | 'item:transition'       // move through the workflow
  | 'item:reassign'         // assign to someone else / take from someone
  | 'item:change_priority'
  | 'item:approve';         // approve / resolve items that need sign-off

const VIEWER: Action[] = ['item:read'];
const MEMBER: Action[] = [...VIEWER, 'item:create', 'item:edit', 'item:comment', 'item:claim', 'item:transition'];
const LEAD: Action[] = [...MEMBER, 'item:reassign', 'item:change_priority', 'item:approve'];

// Each role's permissions are a strict superset of the one below it.
const ROLE_PERMISSIONS: Record<Role, ReadonlySet<Action>> = {
  viewer: new Set(VIEWER),
  member: new Set(MEMBER),
  lead: new Set(LEAD),
};

export function can(role: Role, action: Action): boolean {
  return ROLE_PERMISSIONS[role].has(action);
}