// Guards the permission matrix against accidental changes.
import { describe, expect, it } from 'vitest';
import { can } from './permissions';

describe('permission matrix', () => {
  it('viewer is read-only', () => {
    expect(can('viewer', 'item:read')).toBe(true);
    expect(can('viewer', 'item:create')).toBe(false);
    expect(can('viewer', 'item:claim')).toBe(false);
  });

  it('member can work on items but not manage others', () => {
    expect(can('member', 'item:claim')).toBe(true);
    expect(can('member', 'item:edit')).toBe(true);
    expect(can('member', 'item:reassign')).toBe(false);
    expect(can('member', 'item:change_priority')).toBe(false);
    expect(can('member', 'item:approve')).toBe(false);
  });

  it('lead can do everything', () => {
    expect(can('lead', 'item:reassign')).toBe(true);
    expect(can('lead', 'item:change_priority')).toBe(true);
    expect(can('lead', 'item:approve')).toBe(true);
  });
});