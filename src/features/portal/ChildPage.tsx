/**
 * A pupil's own page. Built to `StudentHome.dc.html`.
 *
 * Reached two ways and deliberately the same screen: a pupil signing in lands
 * here, and a guardian opens it for one of their children. Both see the same
 * record, because a parent and a child looking at the same file and being
 * shown different things is how a school loses an argument it should not be
 * having.
 *
 * The card at the top is the whole project. `POST /auth/ai-handoff` mints a
 * two-minute token and the server builds the destination, so a pupil taps once
 * and arrives at aibeyondschools.co.tz already signed in. Until this screen
 * existed that endpoint had never been called by anything.
 *
 * Reports are shown as not published rather than faked. There is no marks
 * table yet — assessments are Stage 2 — and a report card that said something
 * would be a report card that said something untrue.
 */

import { Link, useParams } from 'react-router-dom';

import { useChildRecord } from '@/api/queries/portal';
import { useHandoff } from '@/api/queries/portal';
import { useCurrentTerm } from '@/api/queries/school';
import { Button, Card, CardHeader, ErrorState, Notice } from '@/components/ui';
import { greet, initials } from '@/domain/portal';
import { useAuth } from '@/features/auth/AuthProvider';
import { longDate } from '@/lib/format';

export default function ChildPage() {
  const { studentId } = useParams();
  const { principal } = useAuth();

  // A pupil signing in has no id in the URL: their own is on the token.
  const id = studentId ?? principal?.student_id ?? undefined;
  const record = useChildRecord(id);
  const term = useCurrentTerm();
  const handoff = useHandoff();

  const isOwnPage = principal?.role === 'student';

  if (record.isError) {
    return (
      <>
        <Back isOwnPage={isOwnPage} />
        <ErrorState onRetry={() => void record.refetch()} />
      </>
    );
  }

  if (!record.data) {
    return (
      <>
        <Back isOwnPage={isOwnPage} />
        <p className="text-sm text-muted" role="status">
          Loading&hellip;
        </p>
      </>
    );
  }

  const { student, class_name: className, guardians } = record.data;
  const firstEnrolment = [...record.data.history].sort((a, b) =>
    String(a.enrolled_on).localeCompare(String(b.enrolled_on)),
  )[0];

  async function crossOver() {
    if (!id) return;
    const result = await handoff.mutateAsync(id);
    // The server built the destination. Replacing rather than opening a tab:
    // a two-minute token in a background tab is a token that expires while
    // somebody looks at the wrong window.
    window.location.assign(result.redirect_url);
  }

  return (
    <>
      <Back isOwnPage={isOwnPage} />

      <div className="mb-5">
        <h1 className="m-0 mb-1 font-display text-[22px] font-semibold tracking-[-0.02em] sm:text-[26px]">
          {isOwnPage ? greet(student.first_name) : `${student.first_name} ${student.surname}`}
        </h1>
        <p className="m-0 text-sm text-muted">
          {className ?? 'Not in a class yet'}
          {record.data.enrolment?.residency === 'boarder' ? ' · boarding' : null}
        </p>
      </div>

      <Card className="mb-4.5 !border-ok-bg">
        <div className="flex flex-wrap items-center justify-between gap-4.5">
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex items-center gap-2.5">
              <span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm bg-brand-strong" />
              <h2 className="m-0 font-display text-[17px] font-semibold">AI Beyond Schools</h2>
            </div>
            <p className="m-0 max-w-[62ch] text-[13.5px] leading-relaxed text-ink-dim">
              {isOwnPage
                ? 'Your lessons live there. You are already signed in with your school account, so there is no second password to remember and nothing to type.'
                : `${student.first_name}'s lessons live there. Opening it from here signs them in with their school account — there is no second password.`}
            </p>
          </div>
          <Button
            variant="primary"
            className="min-h-[50px] flex-none px-5 text-[15px]"
            busy={handoff.isPending}
            onClick={() => void crossOver()}
          >
            {isOwnPage ? 'Go to my lessons' : 'Open their lessons'}
          </Button>
        </div>
        {handoff.isError ? (
          <div className="mt-3.5">
            <Notice>{handoff.error.message}</Notice>
          </div>
        ) : null}
      </Card>

      <div className="grid grid-cols-1 gap-4.5 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader title={isOwnPage ? 'My record' : 'Their record'} />
          <div className="mb-4 flex flex-wrap items-center gap-3.5">
            <span
              aria-hidden="true"
              className="grid h-15 w-15 flex-none place-items-center rounded-[13px] border border-ok-bg bg-brand-soft font-display text-xl font-semibold text-brand-ink"
            >
              {initials(`${student.first_name} ${student.surname}`)}
            </span>
            <div className="min-w-0">
              <p className="m-0 mb-1 font-display text-[18px] font-semibold">
                {student.first_name} {student.middle_name ? `${student.middle_name} ` : ''}
                {student.surname}
              </p>
              <p className="m-0 text-[13px] text-muted">{student.admission_no}</p>
            </div>
          </div>
          <dl className="m-0 flex flex-col gap-2.5 border-t border-line pt-4 text-[13px]">
            <Row label="Class" value={className ?? '—'} />
            <Row
              label="At school since"
              value={firstEnrolment ? longDate(String(firstEnrolment.enrolled_on)) : '—'}
            />
            <Row
              label={guardians.length === 1 ? 'Guardian' : 'Guardians'}
              value={guardians.map((each) => each.full_name).join(', ') || '—'}
            />
          </dl>
          <p className="mt-4 mb-0 text-[12.5px] leading-relaxed text-muted">
            If something here is wrong, tell the school office. {isOwnPage ? 'You cannot' : 'Neither you nor they can'}{' '}
            change it from this account, which is what keeps a pupil record worth trusting.
          </p>
        </Card>

        <div className="flex min-w-0 flex-col gap-4.5">
          <Card>
            <CardHeader title={isOwnPage ? 'My reports' : 'Reports'} />
            <div className="rounded-[10px] border border-line p-3.5">
              <p className="m-0 mb-0.5 text-[13.5px] font-semibold text-ink-dim">
                {term.label ?? 'This term'}
              </p>
              <p className="m-0 text-[12.5px] leading-relaxed text-muted">
                Not published yet. Reports come out at the end of term
                {term.term ? `, on ${longDate(term.term.ends_on)}` : ''}.
              </p>
            </div>
          </Card>

          <Card>
            <CardHeader title="Fees" />
            {isOwnPage ? (
              <p className="m-0 text-[12.5px] leading-relaxed text-muted">
                Your fees are shown to {guardians.at(0)?.full_name ?? 'your guardian'}, who
                receives the invoices for you. Ask at the office if you need a statement yourself.
              </p>
            ) : (
              <>
                <p className="m-0 mb-3.5 text-[12.5px] leading-relaxed text-muted">
                  Every bill this child has had, and what has been received against it.
                </p>
                <Link
                  to={`/children/${id}/statement`}
                  className="inline-flex min-h-11 items-center rounded-control border border-line bg-white px-3.5 text-[13.5px] font-medium text-ink no-underline"
                >
                  See the statement
                </Link>
              </>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

function Back({ isOwnPage }: { readonly isOwnPage: boolean }) {
  if (isOwnPage) return null;
  return (
    <p className="mt-0 mb-3">
      <Link
        to="/"
        className="text-[12.5px] font-semibold text-ink-dim no-underline hover:text-ink"
      >
        &larr; My children
      </Link>
    </p>
  );
}

function Row({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="m-0 text-right font-medium">{value}</dd>
    </div>
  );
}
