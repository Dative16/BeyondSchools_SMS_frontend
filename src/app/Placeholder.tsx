/**
 * A route that exists but has no screen yet.
 *
 * Honest rather than invisible. A nav item that goes nowhere, or a blank page,
 * both read as a bug; a page that says what is coming reads as a plan. These
 * are deleted one at a time as the screens land, and the file goes with the
 * last of them.
 */

import { Link } from 'react-router-dom';

import { Card } from '@/components/ui';

export function PlaceholderPage({
  title,
  note,
}: {
  readonly title: string;
  readonly note: string;
}) {
  return (
    <>
      <h1 className="mt-0 mb-5 font-display text-[26px] font-semibold tracking-[-0.02em]">
        {title}
      </h1>
      <Card>
        <p className="m-0 text-sm leading-relaxed text-muted">{note}</p>
        <p className="mt-2 mb-0 text-[13px] text-faint">
          The API behind this screen is built and tested; the screen itself is next.
        </p>
      </Card>
    </>
  );
}

export function NotFoundPage() {
  return (
    <>
      <h1 className="mt-0 mb-5 font-display text-[26px] font-semibold tracking-[-0.02em]">
        That page is not here
      </h1>
      <Card>
        <p className="m-0 text-sm leading-relaxed text-muted">
          The link may be old, or the page may belong to a part of the system this account
          cannot see.
        </p>
        <p className="mt-3 mb-0">
          <Link to="/" className="text-sm font-semibold text-ok-ink no-underline">
            Back to the dashboard
          </Link>
        </p>
      </Card>
    </>
  );
}
