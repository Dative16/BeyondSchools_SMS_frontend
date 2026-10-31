/**
 * The icon set, inline.
 *
 * Lifted from the design canvas rather than pulled from a package: there are
 * fourteen of them, they are all one stroke weight on a 20x20 box, and an icon
 * font or an SVG sprite would be a network request the first screen waits on.
 * `currentColor` throughout, so a nav item changes colour by changing its text
 * colour and nothing has to be told twice.
 *
 * Decorative by default — these sit beside a label. An icon that is the only
 * thing in a button needs the button to carry `aria-label`.
 */

import type { SVGProps } from 'react';

type IconProps = Omit<SVGProps<SVGSVGElement>, 'children'> & {
  /** Set when the icon is the only content and nothing else names it. */
  readonly title?: string;
};

function Icon({ title, ...props }: IconProps & { readonly children: React.ReactNode }) {
  const { children, ...rest } = props;
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

export const DashboardIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 8.5L10 3l7 5.5V16a1 1 0 01-1 1H4a1 1 0 01-1-1V8.5z" />
  </Icon>
);

export const StudentsIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="10" cy="7" r="3" />
    <path d="M4 16.5c0-2.5 2.7-4 6-4s6 1.5 6 4" />
  </Icon>
);

export const AdmissionsIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 3h7l3 3v11a1 1 0 01-1 1H5a1 1 0 01-1-1V4a1 1 0 011-1z" />
    <path d="M7 11h6M7 14h4" />
  </Icon>
);

export const FeesIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3.5" y="5" width="13" height="10" rx="1.5" />
    <path d="M3.5 8.5h13" />
  </Icon>
);

export const TimetableIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3.5" y="4" width="13" height="12" rx="1.5" />
    <path d="M3.5 8h13M8 8v8" />
  </Icon>
);

export const HomeworkIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 5h12M4 10h12M4 15h8" />
  </Icon>
);

export const CalendarIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3.5" y="4.5" width="13" height="12" rx="1.5" />
    <path d="M3.5 8.5h13M7 3v3M13 3v3" />
  </Icon>
);

/** The ladder: rungs a pupil climbs one a year. */
export const LadderIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6.5 3v14M13.5 3v14M6.5 7h7M6.5 10.5h7M6.5 14h7" />
  </Icon>
);

export const ClassesIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="5" width="14" height="10" rx="1.5" />
    <path d="M7 9h6M7 12h3" />
  </Icon>
);

export const SubjectsIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 4.5h5a2 2 0 012 2V16a1.6 1.6 0 00-1.6-1.6H4V4.5z" />
    <path d="M16 4.5h-5a2 2 0 00-2 2V16a1.6 1.6 0 011.6-1.6H16V4.5z" />
  </Icon>
);

export const SettingsIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="10" cy="10" r="2.5" />
    <path d="M10 3v2M10 15v2M3 10h2M15 10h2M5.2 5.2l1.4 1.4M13.4 13.4l1.4 1.4M14.8 5.2l-1.4 1.4M6.6 13.4l-1.4 1.4" />
  </Icon>
);

export const BellIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M10 3a4.5 4.5 0 00-4.5 4.5c0 3-1.5 4-1.5 4h12s-1.5-1-1.5-4A4.5 4.5 0 0010 3zM8.5 15a1.6 1.6 0 003 0" />
  </Icon>
);

export const ChevronDownIcon = (p: IconProps) => (
  <Icon {...p} strokeWidth="1.6">
    <path d="M5.5 8L10 12.5L14.5 8" />
  </Icon>
);

export const PlusIcon = (p: IconProps) => (
  <Icon {...p} strokeWidth="1.8">
    <path d="M10 4.5v11M4.5 10h11" />
  </Icon>
);

export const MenuIcon = (p: IconProps) => (
  <Icon {...p} strokeWidth="1.7">
    <path d="M3.5 6h13M3.5 10h13M3.5 14h13" />
  </Icon>
);

export const CloseIcon = (p: IconProps) => (
  <Icon {...p} strokeWidth="1.7">
    <path d="M5.5 5.5l9 9M14.5 5.5l-9 9" />
  </Icon>
);

export const SearchIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="9" cy="9" r="5" />
    <path d="M12.8 12.8L17 17" />
  </Icon>
);

export const LogoutIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 6V4a1 1 0 00-1-1H5a1 1 0 00-1 1v12a1 1 0 001 1h6a1 1 0 001-1v-2" />
    <path d="M9 10h8M14.5 7.5L17 10l-2.5 2.5" />
  </Icon>
);

export const OfflineIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 3l14 14" />
    <path d="M6.5 11.5a4.5 4.5 0 015.2-1.2M4 8.5a8 8 0 013.3-1.9M15.8 11a4.5 4.5 0 00-1.3-1M16.2 8.3A8 8 0 0012 6.2" />
    <path d="M10 15h.01" />
  </Icon>
);
