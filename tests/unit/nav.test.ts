import { describe, expect, it } from 'vitest';

import { visibleNav } from '@/components/layout/nav';
import type { Permission } from '@/types/domain';

const holding = (...granted: Permission[]) => {
  const set = new Set<Permission>(granted);
  return (permission: Permission) => set.has(permission);
};

const labels = (groups: ReturnType<typeof visibleNav>) =>
  groups.flatMap((group) => group.items.map((item) => item.label));

describe('what the nav shows', () => {
  it('shows a bursar fees but not the roll', () => {
    const groups = visibleNav(holding('invoice:read', 'payment:read'));

    expect(labels(groups)).toContain('Fees and payments');
    expect(labels(groups)).not.toContain('Students');
  });

  it('shows a class teacher the roll but not the money', () => {
    const groups = visibleNav(holding('student:read', 'attendance:take'));

    expect(labels(groups)).toContain('Students');
    expect(labels(groups)).not.toContain('Fees and payments');
    expect(labels(groups)).not.toContain('Admissions');
  });

  it('always shows the dashboard, because every role has one', () => {
    expect(labels(visibleNav(holding()))).toContain('Dashboard');
  });

  it('drops a group once nothing in it is permitted', () => {
    const headings = visibleNav(holding()).map((group) => group.heading);

    // Teaching survives: its items are Phase 2 placeholders, shown to everyone
    // on purpose. School survives on the dashboard alone.
    expect(headings).toEqual(['School', 'Teaching']);
  });

  it('never makes a Phase 2 item navigable', () => {
    const soon = visibleNav(holding()).flatMap((group) =>
      group.items.filter((item) => item.soon),
    );

    expect(soon.map((item) => item.label)).toEqual(['Timetable', 'Homework']);
  });
});
