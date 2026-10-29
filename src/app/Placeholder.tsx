/**
 * What a route that is not a route shows.
 *
 * `PlaceholderPage` is gone: every route in the staff shell now has a screen.
 * What is left is the not-found page, which is a real destination — somebody
 * following an old link, or reaching for a part of the system their account
 * cannot see.
 */

import { Link } from 'react-router-dom';

import { Card } from '@/components/ui';

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
