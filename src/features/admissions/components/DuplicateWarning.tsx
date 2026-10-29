/**
 * "This may already be a pupil here."
 *
 * The warning that has to be read before a place is offered, because offering
 * one to a child who already has a record creates a second record — and two
 * terms of marks, fees and attendance then get split across both, which is an
 * afternoon of somebody's life to unpick.
 *
 * It says what matched and what did not. The commonest high score in a real
 * school is one phone with several children on it, so "matched on guardian
 * phone; names and dates of birth do not match" is usually the sentence that
 * resolves it in four seconds. A screen that only said "possible duplicate"
 * would send a registrar to open two records and compare them by hand.
 *
 * Dismissing it is a local act. It unblocks this registrar's reading of this
 * screen and changes nothing on the server, because the score is the server's
 * opinion and not something a click should overwrite.
 */

import { Link } from 'react-router-dom';

import { Button, Card } from '@/components/ui';

export interface DuplicateMatch {
  readonly student_id: string;
  readonly score: number;
  readonly reason: string;
}

export function DuplicateWarning({
  matches,
  onDismiss,
}: {
  readonly matches: readonly DuplicateMatch[];
  readonly onDismiss: () => void;
}) {
  return (
    <Card className="!border-warn-ink/40 !bg-warn-bg/30">
      <div className="mb-2.5 flex items-center gap-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-warn-ink" aria-hidden="true" />
        <h2 className="m-0 font-display text-[15px] font-semibold">Possible duplicate</h2>
      </div>

      <p className="m-0 mb-3 text-[12.5px] leading-relaxed text-ink-dim">
        Something on this application already appears on a pupil&rsquo;s record. Check
        whether this is a sibling before you offer a place — offering one to a child who is
        already here makes a second record, and the marks and fees then split across both.
      </p>

      <ul className="m-0 mb-3 flex list-none flex-col gap-2 p-0">
        {matches.map((match) => (
          <li
            key={match.student_id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-line bg-white p-3"
          >
            <p className="m-0 min-w-0 text-[12.5px] text-ink-dim">
              <span className="font-semibold">What matched:</span> {match.reason} (
              {match.score} out of 100)
            </p>
            <Link
              to={`/students/${match.student_id}`}
              className="text-[12.5px] font-semibold text-ok-ink no-underline"
            >
              Open that record &rarr;
            </Link>
          </li>
        ))}
      </ul>

      <p className="m-0 mb-3 text-[12.5px] leading-relaxed text-muted">
        The commonest reason for this is one phone number with several children on it. That
        is a sibling, not a duplicate.
      </p>

      <Button size="sm" onClick={onDismiss}>
        I have checked — this is not a duplicate
      </Button>
    </Card>
  );
}
