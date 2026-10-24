/**
 * The one button.
 *
 * Three variants, and `primary` is the only filled one — a screen with two
 * green buttons on it has told the user nothing about which to press. `danger`
 * is a text treatment rather than a red fill, because the destructive actions
 * in this app (void an invoice, decline an application) all sit behind a
 * confirmation anyway.
 *
 * `busy` rather than a separate loading prop: it disables the button and keeps
 * its width, so a double tap on a slow connection cannot raise two invoices.
 */

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'md' | 'sm';

const base =
  'inline-flex items-center justify-center gap-2 rounded-control font-sans font-semibold ' +
  'transition-colors disabled:cursor-not-allowed disabled:opacity-55 whitespace-nowrap';

const variants: Record<Variant, string> = {
  primary: 'bg-brand-strong text-white hover:bg-brand-ink',
  secondary: 'bg-white text-ink border border-line hover:bg-canvas',
  ghost: 'bg-transparent text-ink-soft hover:bg-line-soft',
  danger: 'bg-white text-bad-ink border border-line hover:bg-bad-bg',
};

const sizes: Record<Size, string> = {
  md: 'min-h-11 px-4 text-sm',
  sm: 'min-h-11 px-3 text-[13px]',
};

interface Shared {
  readonly variant?: Variant;
  readonly size?: Size;
  readonly children: ReactNode;
  readonly className?: string;
}

export type ButtonProps = Shared &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'> & {
    readonly busy?: boolean;
  };

export function Button({
  variant = 'secondary',
  size = 'md',
  busy = false,
  disabled,
  children,
  className = '',
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled ?? busy}
      aria-busy={busy || undefined}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {busy ? <Spinner /> : null}
      {children}
    </button>
  );
}

/** Same treatment, but it navigates. A link that looks like a button is still a link. */
export function ButtonLink({
  to,
  variant = 'secondary',
  size = 'md',
  children,
  className = '',
}: Shared & { readonly to: string }) {
  return (
    <Link
      to={to}
      className={`${base} ${variants[variant]} ${sizes[size]} no-underline ${className}`}
    >
      {children}
    </Link>
  );
}

function Spinner() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" className="animate-spin">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="2" opacity="0.25" fill="none" />
      <path d="M14.5 8A6.5 6.5 0 008 1.5" stroke="currentColor" strokeWidth="2" fill="none" />
    </svg>
  );
}
