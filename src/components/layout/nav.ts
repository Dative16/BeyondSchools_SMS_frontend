/**
 * The navigation, as data.
 *
 * One list, so the sidebar and the phone drawer cannot drift apart, and so a
 * route that needs a permission says so here rather than in a component that
 * also has to lay itself out.
 *
 * The Phase 2 items are in the list on purpose. The design shows them greyed,
 * and that is a deliberate promise to a head teacher being sold the system:
 * timetables and homework are coming, and this is where they will be. An item
 * with `soon` is never a link.
 */

import type { ComponentType, SVGProps } from 'react';

import type { Permission } from '@/types/domain';

import {
  AdmissionsIcon,
  CalendarIcon,
  ClassesIcon,
  DashboardIcon,
  FeesIcon,
  HomeworkIcon,
  LadderIcon,
  StudentsIcon,
  TimetableIcon,
} from '@/components/icons';

export interface NavItem {
  readonly to: string;
  readonly label: string;
  readonly icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** Hidden unless the account holds this permission. */
  readonly permission?: Permission;
  /** The badge to show beside it, if any. */
  readonly badge?: 'admissions';
  /** Drawn but not navigable, with the phase it lands in. */
  readonly soon?: string;
}

export interface NavGroup {
  readonly heading: string;
  readonly items: readonly NavItem[];
}

export const NAV: readonly NavGroup[] = [
  {
    heading: 'School',
    items: [
      { to: '/', label: 'Dashboard', icon: DashboardIcon },
      { to: '/students', label: 'Students', icon: StudentsIcon, permission: 'student:read' },
      {
        to: '/admissions',
        label: 'Admissions',
        icon: AdmissionsIcon,
        permission: 'admission:review',
        badge: 'admissions',
      },
      {
        to: '/fees',
        label: 'Fees and payments',
        icon: FeesIcon,
        permission: 'invoice:read',
      },
    ],
  },
  {
    heading: 'Teaching',
    items: [
      { to: '/timetable', label: 'Timetable', icon: TimetableIcon, soon: 'Phase 2' },
      { to: '/homework', label: 'Homework', icon: HomeworkIcon, soon: 'Phase 2' },
    ],
  },
  // Setup. Only screens that exist are listed: a nav item pointing at nothing
  // is the fault that left "Admit a child" dead on three screens for weeks.
  // School settings and Subjects join this group when they are built.
  {
    heading: 'Setup',
    items: [
      {
        to: '/setup/years',
        label: 'Years and terms',
        icon: CalendarIcon,
        permission: 'academic:manage',
      },
      {
        to: '/setup/levels',
        label: 'Levels',
        icon: LadderIcon,
        permission: 'academic:manage',
      },
      {
        to: '/setup/classes',
        label: 'Classes',
        icon: ClassesIcon,
        permission: 'academic:manage',
      },
    ],
  },
];

/** The groups this account can actually see, with empty ones dropped. */
export function visibleNav(can: (permission: Permission) => boolean): readonly NavGroup[] {
  return NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.permission || can(item.permission)),
  })).filter((group) => group.items.length > 0);
}
