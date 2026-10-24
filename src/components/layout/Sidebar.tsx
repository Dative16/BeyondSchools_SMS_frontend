/**
 * The nav.
 *
 * One component, two shapes. On a wide screen it is the column the design
 * draws, always there. Below `lg` it is a drawer over the content, because 252
 * pixels of a 360-pixel phone is most of the screen given to navigation.
 *
 * The drawer is where the fiddly accessibility work is, and it is worth doing
 * properly: focus moves into it when it opens and back to the button when it
 * closes, Escape shuts it, and the page behind does not scroll under your
 * thumb. Those four things are the difference between a drawer and a trap.
 */

import { useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';

import { CloseIcon, LogoutIcon } from '@/components/icons';
import { CountBadge } from '@/components/ui';

import type { NavGroup } from './nav';

interface Props {
  readonly groups: readonly NavGroup[];
  readonly badges: { readonly admissions?: number };
  /** Open state of the phone drawer. Ignored at `lg` and up. */
  readonly open: boolean;
  readonly onClose: () => void;
  /** Shown at the foot of the drawer only: the bar has no room for it there. */
  readonly onSignOut?: () => void;
}

export function Sidebar({ groups, badges, open, onClose, onSignOut }: Props) {
  return (
    <>
      {/* The column, from lg up. */}
      <nav
        aria-label="Main"
        className="hidden w-[252px] shrink-0 border-r border-line bg-white px-3.5 py-5 lg:block"
      >
        <NavItems groups={groups} badges={badges} />
      </nav>

      {/* The drawer, below lg. */}
      <Drawer open={open} onClose={onClose}>
        <NavItems groups={groups} badges={badges} onNavigate={onClose} />
        {onSignOut ? (
          <button
            type="button"
            onClick={onSignOut}
            className="mt-auto flex min-h-11 items-center gap-[11px] rounded-control px-[13px] text-sm font-medium text-ink-soft hover:bg-line-soft"
          >
            <LogoutIcon width={17} height={17} />
            Sign out
          </button>
        ) : null}
      </Drawer>
    </>
  );
}

function Drawer({
  open,
  onClose,
  children,
}: {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly children: React.ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;

    opener.current = document.activeElement;
    panel.current?.querySelector<HTMLElement>('a, button')?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);

    // Stop the page scrolling behind the drawer.
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      (opener.current as HTMLElement | null)?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 lg:hidden">
      <button
        type="button"
        aria-label="Close the menu"
        onClick={onClose}
        className="absolute inset-0 w-full cursor-default border-0 bg-ink/40 p-0"
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label="Main navigation"
        className="relative flex h-full w-[280px] max-w-[85vw] flex-col overflow-y-auto bg-white px-3.5 py-4"
      >
        <div className="mb-2 flex items-center justify-between">
          <span className="font-display text-base font-bold tracking-[-0.01em]">BeyondSchools</span>
          <button
            type="button"
            aria-label="Close the menu"
            onClick={onClose}
            className="grid h-11 w-11 place-items-center rounded-control text-ink-dim hover:bg-line-soft"
          >
            <CloseIcon />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function NavItems({
  groups,
  badges,
  onNavigate,
}: {
  readonly groups: readonly NavGroup[];
  readonly badges: { readonly admissions?: number };
  readonly onNavigate?: () => void;
}) {
  return (
    <>
      {groups.map((group) => (
        <div key={group.heading} className="mb-1 [&:not(:first-child)]:mt-5">
          <p className="m-0 mb-2 ml-2.5 text-[11px] font-semibold tracking-[0.08em] text-faint uppercase">
            {group.heading}
          </p>
          {group.items.map((item) =>
            item.soon ? (
              <span
                key={item.to}
                className="flex min-h-11 items-center gap-[11px] rounded-control px-[13px] text-sm font-medium text-faint"
              >
                <item.icon width={17} height={17} />
                {item.label}
                <span className="ml-auto text-[10px] font-medium">{item.soon}</span>
              </span>
            ) : (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `flex min-h-11 items-center gap-[11px] rounded-control px-[13px] text-sm no-underline ${
                    isActive
                      ? 'border-l-[3px] border-brand bg-brand-soft pl-2.5 font-semibold text-brand-ink'
                      : 'font-medium text-ink-soft hover:bg-line-soft'
                  }`
                }
              >
                <item.icon width={17} height={17} />
                <span className="truncate">{item.label}</span>
                {item.badge === 'admissions' && badges.admissions ? (
                  <span className="ml-auto">
                    <CountBadge count={badges.admissions} label="waiting for review" />
                  </span>
                ) : null}
              </NavLink>
            ),
          )}
        </div>
      ))}
    </>
  );
}
