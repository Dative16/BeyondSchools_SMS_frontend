/**
 * AI Beyond Schools.
 *
 * The artboard shows lessons completed, homework done and a last sign-in.
 * None of those exist yet: Phase 1 knows only whether a child has ever crossed
 * to the platform, because the handoff is the only thing built. So the card
 * shows what is true and says what is not yet, rather than drawing four
 * figures that would be invented.
 *
 * The part worth keeping is the sentence at the bottom. It is the reason the
 * handoff was built the way it was, and the answer to the question a head
 * teacher asks first: no, the children do not need a second password.
 */

import { Card, CardHeader } from '@/components/ui';

export function PlatformCard({
  levelServed,
  signedIn,
  firstName,
}: {
  readonly levelServed: string | null;
  readonly signedIn: boolean;
  readonly firstName: string;
}) {
  return (
    <Card>
      <div className="mb-3 flex items-center gap-2.5">
        <span className="h-[9px] w-[9px] rounded-[2px] bg-brand" aria-hidden="true" />
        <CardHeader title="AI Beyond Schools" />
      </div>

      <dl className="m-0 flex flex-col gap-2.5 text-[13px]">
        <div className="flex justify-between gap-3">
          <dt className="text-muted">Level served</dt>
          <dd className="m-0 font-medium">{levelServed ?? 'Not enrolled'}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted">Account</dt>
          <dd className="m-0 font-medium">
            {signedIn ? 'Has signed in' : 'Not signed in yet'}
          </dd>
        </div>
      </dl>

      <p className="mt-3.5 mb-0 text-[12.5px] leading-relaxed text-muted">
        {firstName} signs in with the school account, so there is no second password, and the
        level follows the next promotion run automatically. Lessons and homework appear here
        once the platform starts reporting them.
      </p>
    </Card>
  );
}
