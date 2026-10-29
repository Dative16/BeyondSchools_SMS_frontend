/**
 * One application, from submitted to enrolled.
 *
 * The right-hand column shows exactly one action, and which one depends on
 * where the application stands. That is the artboard's shape and it is the
 * right one: a registrar opening this should not be choosing between "offer"
 * and "enrol" on a child whose family has not paid.
 *
 * The step that is not an approval is the point of the whole screen. There is
 * no accept button — a place is accepted when the deposit is on the ledger —
 * so between "offered" and "enrolled" sits a money entry a bursar makes, with
 * a receipt number from the book. The card says so in as many words, because
 * every other school system in the world has an accept button and somebody
 * will look for it.
 */

import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { useApplication } from '@/api/queries/admissions';
import { ChevronDownIcon } from '@/components/icons';
import { Card, CardHeader, ErrorState, Notice, Pill } from '@/components/ui';
import {
  actionsFor,
  funnelPosition,
  isLikelyDuplicate,
  offerStanding,
  statePill,
  stateNote,
  FUNNEL,
  stateLabel,
} from '@/domain/admissions';
import type { ApplicationState } from '@/domain/admissions';
import { ageLabel } from '@/domain/student';
import { useAuth } from '@/features/auth/AuthProvider';
import { longDate, msisdn } from '@/lib/format';

import { ApplicationActions } from './components/ApplicationActions';
import { DuplicateWarning } from './components/DuplicateWarning';

export default function ApplicationPage() {
  const { applicationId = '' } = useParams();
  const { can } = useAuth();
  const query = useApplication(applicationId);
  const [duplicateDismissed, setDuplicateDismissed] = useState(false);

  if (query.isError) {
    return (
      <>
        <BackLink />
        <Card>
          <ErrorState
            title="That application did not load"
            detail="The link may be old, or this account may not be allowed to see it."
            onRetry={() => void query.refetch()}
          />
        </Card>
      </>
    );
  }

  if (query.isLoading || !query.data) {
    return (
      <>
        <BackLink />
        <div className="h-96 animate-pulse rounded-card bg-line-soft" aria-hidden="true" />
        <span className="sr-only" role="status">
          Loading the application
        </span>
      </>
    );
  }

  const detail = query.data;
  const application = detail.application;
  const state = application.state;
  const pill = statePill(state);
  const note = stateNote(state);
  const actions = actionsFor(state);
  const today = new Date();
  const offer = offerStanding(application.offer_expires_on, today);
  // The detail response carries the matches themselves, not the flattened
  // score the queue row has — which means the warning can link straight to the
  // pupil it matched instead of sending somebody to search for them.
  const matches = detail.duplicates.filter((match) => isLikelyDuplicate(match.score));

  return (
    <>
      <BackLink />

      <div className="mb-4.5 flex flex-wrap items-end justify-between gap-3.5">
        <div className="min-w-0">
          <div className="mb-1.5 flex flex-wrap items-center gap-2.5">
            <h1 className="m-0 font-display text-[25px] font-semibold tracking-[-0.02em]">
              {application.child_first_name || application.child_surname
                ? [application.child_first_name, application.child_surname]
                    .filter(Boolean)
                    .join(' ')
                : 'A child with no name yet'}
            </h1>
            <Pill tone={pill.tone}>{pill.label}</Pill>
          </div>
          <p className="m-0 text-sm text-muted">
            {application.reference}
            {detail.level_name ? ` · applying for ${detail.level_name}` : null}
            {application.submitted_at
              ? ` · submitted ${longDate(application.submitted_at)}`
              : ' · not sent yet'}
          </p>
        </div>
      </div>

      <Card className="mb-4.5">
        <Funnel state={state} />
        {note ? (
          <p className="mt-3.5 mb-0 max-w-[80ch] text-[12.5px] leading-relaxed text-muted">
            {note}
          </p>
        ) : null}
        {offer && (state === 'offered' || state === 'accepted') ? (
          <p
            className={`mt-2 mb-0 text-[12.5px] font-medium ${
              offer.tone === 'bad'
                ? 'text-bad-ink'
                : offer.tone === 'warn'
                  ? 'text-warn-ink'
                  : 'text-muted'
            }`}
          >
            {offer.text}.
          </p>
        ) : null}
      </Card>

      <div className="flex flex-wrap gap-4.5">
        <div className="flex min-w-0 flex-[1.4_1_440px] flex-col gap-4.5">
          {matches.length > 0 && !duplicateDismissed ? (
            <DuplicateWarning
              matches={matches}
              onDismiss={() => setDuplicateDismissed(true)}
            />
          ) : null}

          <Card>
            <CardHeader title="The child" />
            <dl className="m-0 grid gap-x-6 gap-y-2.5 text-[13px] sm:grid-cols-2">
              <Fact
                label="Full name"
                value={[
                  application.child_first_name,
                  application.child_middle_name,
                  application.child_surname,
                ]
                  .filter(Boolean)
                  .join(' ')}
              />
              <Fact
                label="Date of birth"
                value={
                  application.date_of_birth
                    ? `${longDate(application.date_of_birth)} (${ageLabel(
                        application.date_of_birth,
                        today,
                      )})`
                    : null
                }
              />
              <Fact
                label="Sex"
                value={
                  application.sex === 'f' ? 'Girl' : application.sex === 'm' ? 'Boy' : null
                }
              />
              <Fact label="Class applied for" value={detail.level_name} />
              <Fact label="Previous school" value={application.previous_school ?? 'None'} />
              <Fact
                label="Birth certificate"
                value={application.birth_certificate_no ?? 'Not given'}
              />
              {application.special_needs ? (
                <div className="sm:col-span-2">
                  <dt className="text-muted">What a teacher should know</dt>
                  <dd className="m-0 font-medium">{application.special_needs}</dd>
                </div>
              ) : null}
            </dl>
          </Card>

          <Card>
            <CardHeader title="The guardian" />
            <div className="mb-3 flex flex-wrap items-center gap-2.5">
              <p className="m-0 text-[13.5px] font-semibold">
                {application.guardian_name ?? 'Not named'}
              </p>
              {application.phone_verified_at ? (
                <Pill tone="ok">Phone confirmed</Pill>
              ) : (
                <Pill tone="warn">Phone not confirmed</Pill>
              )}
            </div>
            <dl className="m-0 grid gap-x-6 gap-y-2.5 text-[13px] sm:grid-cols-2">
              <Fact
                label="Relationship"
                value={titleCase(application.guardian_relationship)}
              />
              <Fact
                label="Phone"
                value={msisdn(application.guardian_phone ?? application.phone)}
              />
              <Fact label="National ID" value={application.guardian_national_id ?? 'Not given'} />
              <Fact label="Email" value={application.guardian_email ?? 'Not given'} />
              <Fact label="Home area" value={application.guardian_address ?? 'Not given'} />
            </dl>
          </Card>

          <Card>
            <CardHeader
              title="Documents from the form"
              note="Photographed by the guardian on a phone. Open each one before you offer a place."
            />
            <Documents checklist={detail.checklist} held={detail.documents} />
          </Card>
        </div>

        <div className="flex min-w-0 flex-[1_1_330px] flex-col gap-4.5">
          {can('admission:review') ? (
            <ApplicationActions
              applicationId={applicationId}
              detail={detail}
              actions={actions}
            />
          ) : null}

          <Card>
            <CardHeader title="What has happened" />
            <History detail={detail} />
          </Card>
        </div>
      </div>
    </>
  );
}

function Funnel({ state }: { readonly state: ApplicationState }) {
  const at = funnelPosition(state);
  const offPath = at < 0;

  return (
    <>
      <ol className="m-0 flex list-none flex-wrap gap-1.5 p-0">
        {FUNNEL.map((step, index) => (
          <li key={step} className="min-w-0 flex-1">
            <span
              className={`block h-[5px] rounded-[3px] ${
                offPath ? 'bg-line' : index <= at ? 'bg-brand' : 'bg-line'
              }`}
            />
            <span
              className={`mt-1.5 block truncate text-[11px] ${
                !offPath && index === at ? 'font-semibold text-brand-ink' : 'text-muted'
              }`}
            >
              {stateLabel(step)}
            </span>
          </li>
        ))}
      </ol>
      {offPath ? (
        <p className="mt-3 mb-0 text-[12.5px] font-medium text-ink-dim">
          This application left the funnel. It is {stateLabel(state).toLowerCase()}.
        </p>
      ) : null}
    </>
  );
}

function Documents({
  checklist,
  held,
}: {
  readonly checklist: ApplicationDetailChecklist;
  readonly held: readonly { kind: string; file_name: string | null; created_at: string }[];
}) {
  const attached = new Map(held.map((document) => [document.kind, document]));
  const asked = checklist.filter((item) => item.key.startsWith('document:'));
  const rows = asked.length > 0 ? asked : checklist;

  if (rows.length === 0) {
    return (
      <p className="m-0 text-[13px] text-muted">
        This school asks for no documents at application time.
      </p>
    );
  }

  return (
    <ul className="m-0 flex list-none flex-col gap-3 p-0">
      {rows.map((item) => {
        const kind = item.key.replace(/^document:/, '');
        const file = attached.get(kind);
        return (
          <li
            key={item.key}
            className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-line p-3"
          >
            <div className="min-w-0">
              <p className="m-0 text-[13px] font-semibold">{item.label}</p>
              <p className="m-0 text-[12px] text-muted">
                {file
                  ? `Added ${longDate(file.created_at)}`
                  : item.required
                    ? 'Not attached. Ask the guardian to bring it to the desk.'
                    : 'Not attached. Optional.'}
              </p>
            </div>
            {file ? <Pill tone="ok">Attached</Pill> : <Pill tone="neutral">Missing</Pill>}
          </li>
        );
      })}
    </ul>
  );
}

type ApplicationDetailChecklist = readonly {
  key: string;
  label: string;
  required: boolean;
  done: boolean;
}[];

function History({
  detail,
}: {
  readonly detail: { application: Record<string, unknown> };
}) {
  const application = detail.application as {
    created_at?: string;
    submitted_at?: string | null;
    offered_at?: string | null;
    accepted_at?: string | null;
    enrolled_at?: string | null;
    decline_reason?: string | null;
  };

  const entries = [
    ['Form started', application.created_at],
    ['Sent to the school', application.submitted_at],
    ['Place offered', application.offered_at],
    ['Deposit received, place accepted', application.accepted_at],
    ['Enrolled', application.enrolled_at],
  ].filter(([, when]) => Boolean(when)) as [string, string][];

  if (entries.length === 0) {
    return <p className="m-0 text-[13px] text-muted">Nothing has happened yet.</p>;
  }

  return (
    <ol className="m-0 flex list-none flex-col gap-3 p-0">
      {entries.map(([what, when], index) => (
        <li key={what} className="flex gap-3">
          <span
            className={`mt-1.5 h-2 w-2 flex-none rounded-full ${
              index === entries.length - 1 ? 'bg-brand' : 'bg-line'
            }`}
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="m-0 text-[13px] font-medium">{what}</p>
            <p className="m-0 text-[12px] text-muted">{longDate(when)}</p>
          </div>
        </li>
      ))}
      {application.decline_reason ? (
        <li>
          <Notice tone="warn">Declined: {application.decline_reason}</Notice>
        </li>
      ) : null}
    </ol>
  );
}

function Fact({ label, value }: { readonly label: string; readonly value: string | null }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className={`m-0 ${value ? 'font-medium' : 'text-warn-ink'}`}>
        {value || 'Not given'}
      </dd>
    </div>
  );
}

const titleCase = (value: string | null | undefined): string | null =>
  value ? value.replace(/_/g, ' ').replace(/^./, (first) => first.toUpperCase()) : null;

function BackLink() {
  return (
    <Link
      to="/admissions"
      className="mb-3.5 inline-flex items-center gap-1.5 text-[13px] font-medium text-ok-ink no-underline hover:text-brand-ink"
    >
      <ChevronDownIcon width={14} height={14} className="rotate-90" />
      All applications
    </Link>
  );
}
