/**
 * "Needs your attention".
 *
 * The dot is coloured, but the colour is never the only signal: urgent items
 * sort first and carry a word in their title that says what is wrong. About
 * one man in twelve cannot separate the red from the amber, and a severity you
 * can only see is not a severity.
 *
 * Empty is a real state and says so plainly. A card that renders nothing when
 * there is nothing wrong looks broken on the one morning a head teacher most
 * wants reassurance.
 */

import { Link } from 'react-router-dom';

import type { AttentionItem } from '@/domain/attention';

export function AttentionList({
  items,
  loading,
}: {
  readonly items: readonly AttentionItem[];
  readonly loading: boolean;
}) {
  if (loading) {
    return (
      <div className="flex flex-col gap-3" aria-hidden="true">
        {[0, 1, 2].map((row) => (
          <div key={row} className="h-12 animate-pulse rounded bg-line-soft" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className="m-0 py-6 text-center text-[13px] text-muted">
        Nothing is waiting. Suspense is clear, every fee structure is published, and no
        application is unreviewed.
      </p>
    );
  }

  return (
    <ul className="m-0 flex list-none flex-col gap-3 p-0">
      {items.map((item, index) => (
        <li
          key={item.id}
          className={`flex gap-[11px] ${
            index < items.length - 1 ? 'border-b border-line-soft pb-3' : ''
          }`}
        >
          <span
            className={`mt-1.5 h-[7px] w-[7px] flex-none rounded-full ${
              item.severity === 'urgent' ? 'bg-bad-ink' : 'bg-warn-ink'
            }`}
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="m-0 mb-[3px] text-[13px] font-semibold">
              <span className="sr-only">
                {item.severity === 'urgent' ? 'Urgent: ' : 'Soon: '}
              </span>
              {item.title}
            </p>
            <p className="m-0 mb-1.5 text-[12.5px] leading-relaxed text-muted">{item.detail}</p>
            <Link
              to={item.action.to}
              className="text-[12.5px] font-semibold text-ok-ink no-underline hover:text-brand-ink"
            >
              {item.action.label} &rarr;
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}
