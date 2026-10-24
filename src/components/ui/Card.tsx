/**
 * A white box with a hairline border. No shadow anywhere in this design —
 * elevation on a screen a teacher reads in a bright classroom just lowers
 * contrast.
 *
 * `Card.Header` exists because almost every card in the design has the same
 * header: a Poppins title on the left, one small link on the right.
 */

import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface CardProps {
  readonly children: ReactNode;
  readonly className?: string;
  /** Tightens the padding for a card inside a card. */
  readonly inner?: boolean;
}

export function Card({ children, className = '', inner = false }: CardProps) {
  return (
    <section
      className={`border border-line bg-white ${
        inner ? 'rounded-[10px] p-[13px_14px]' : 'rounded-card p-[18px_19px]'
      } ${className}`}
    >
      {children}
    </section>
  );
}

interface HeaderProps {
  readonly title: string;
  /** One line under the title. The design uses it to say what a number means. */
  readonly note?: string;
  readonly action?: { readonly label: string; readonly to: string };
  readonly children?: ReactNode;
}

export function CardHeader({ title, note, action, children }: HeaderProps) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <h2 className="m-0 font-display text-[15px] font-semibold">{title}</h2>
        {note ? <p className="mt-1 mb-0 text-[12.5px] text-muted">{note}</p> : null}
      </div>
      {action ? (
        <Link
          to={action.to}
          className="text-[12.5px] font-semibold text-ok-ink no-underline hover:text-brand-ink"
        >
          {action.label} &rarr;
        </Link>
      ) : null}
      {children}
    </div>
  );
}

Card.Header = CardHeader;
