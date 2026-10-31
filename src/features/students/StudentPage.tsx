/**
 * One child's record, as the StudentProfile artboard draws it.
 *
 * The header, the enrolment history, the guardians, the fees and the platform
 * card are all from the artboard. Two cards are not, and both are here because
 * the data is already on the response and withholding it would be the odd
 * choice: what is still missing from the record, and — only for an account
 * that may read it — the medical detail. A class teacher who cannot see that a
 * child is asthmatic is the gap that matters on a sports afternoon.
 */

import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { useChecklist, useStatement, useStudent } from '@/api/queries/student';
import { ChevronDownIcon } from '@/components/icons';
import { Button, Card, ErrorState, Pill } from '@/components/ui';
import { ageLabel, initialsOf, statusPill } from '@/domain/student';
import { useAuth } from '@/features/auth/AuthProvider';
import { longDate } from '@/lib/format';

import { ChangeClassDialog } from './components/ChangeClassDialog';
import { EnrolmentHistory } from './components/EnrolmentHistory';
import { FeesCard } from './components/FeesCard';
import { ProfilePanels } from './components/ProfilePanels';
import { GuardiansCard } from './components/GuardiansCard';
import { MedicalCard } from './components/MedicalCard';
import { MissingCard } from './components/MissingCard';
import { PlatformCard } from './components/PlatformCard';
import { StudentActions } from './components/StudentActions';

export default function StudentPage() {
  const { studentId = '' } = useParams();
  const { can } = useAuth();

  const [moving, setMoving] = useState(false);

  const profile = useStudent(studentId);
  const statement = useStatement(studentId, can('invoice:read'));
  const checklist = useChecklist(studentId, can('student:manage'));

  if (profile.isError) {
    return (
      <>
        <BackLink />
        <Card>
          <ErrorState
            title="That child's record did not load"
            detail="The link may be old, or this account may not be allowed to see this child."
            onRetry={() => void profile.refetch()}
          />
        </Card>
      </>
    );
  }

  if (profile.isLoading || !profile.data) {
    return (
      <>
        <BackLink />
        <div className="flex flex-col gap-4.5" aria-hidden="true">
          <div className="h-[118px] animate-pulse rounded-card bg-line-soft" />
          <div className="h-80 animate-pulse rounded-card bg-line-soft" />
        </div>
        <span className="sr-only" role="status">
          Loading the record
        </span>
      </>
    );
  }

  const { student, enrolment, class_name, history, guardians, health } = profile.data;
  const fieldValues = profile.data.field_values;
  const status = statusPill(student.status);
  const today = new Date();

  return (
    <>
      <BackLink />

      <Card className="mb-4.5 !p-[20px_22px]">
        <div className="flex flex-wrap items-start gap-4.5">
          <span
            aria-hidden="true"
            className="grid h-[66px] w-[66px] flex-none place-items-center rounded-[14px] border border-ok-bg bg-brand-soft font-display text-[22px] font-semibold text-brand-ink"
          >
            {initialsOf(student.first_name, student.surname)}
          </span>

          <div className="min-w-0 flex-[1_1_300px]">
            <div className="mb-1.5 flex flex-wrap items-center gap-2.5">
              <h1 className="m-0 font-display text-[25px] font-semibold tracking-[-0.02em]">
                {[student.first_name, student.middle_name, student.surname]
                  .filter(Boolean)
                  .join(' ')}
              </h1>
              <Pill tone={status.tone}>{status.label}</Pill>
              {enrolment?.is_repeating ? <Pill tone="warn">Repeating the year</Pill> : null}
            </div>

            <dl className="m-0 flex flex-wrap gap-x-6.5 gap-y-1.5 text-[13px]">
              <Fact label="Admission no." value={student.admission_no} />
              <Fact
                label="Born"
                value={`${longDate(student.date_of_birth)} (${ageLabel(
                  student.date_of_birth,
                  today,
                )})`}
              />
              <Fact label="Class" value={class_name ?? 'Not enrolled this year'} />
              {enrolment ? (
                <Fact label="Joined" value={longDate(enrolment.enrolled_on)} />
              ) : null}
              {enrolment?.residency === 'boarder' ? (
                <Fact label="Boarding" value={enrolment.dormitory ?? 'Dormitory not set'} />
              ) : null}
              {enrolment?.uses_transport ? (
                <Fact label="Bus" value={enrolment.transport_route ?? 'Route not set'} />
              ) : null}
            </dl>
          </div>

          <StudentActions profile={profile.data} canManage={can('student:manage')} />
        </div>
      </Card>

      <div className="mb-4.5">
        <ProfilePanels
          studentId={studentId}
          guardians={guardians}
          fieldValues={fieldValues}
        />
      </div>

      <div className="flex flex-wrap gap-4.5">
        <div className="min-w-0 flex-[1.3_1_400px]">
          <Card>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="m-0 font-display text-[15px] font-semibold">Enrolment history</h2>
                <p className="mt-1 mb-0 text-[12.5px] text-muted">
                  One row per academic year. Promotion writes a new row rather than changing this
                  one, so every report card stays reachable.
                </p>
              </div>
              {enrolment && can('student:manage') ? (
                <Button size="sm" onClick={() => setMoving(true)}>
                  Change class
                </Button>
              ) : null}
            </div>
            <EnrolmentHistory rows={history} />
          </Card>
        </div>

        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-4.5">
          <GuardiansCard guardians={guardians} />

          {can('invoice:read') ? (
            <FeesCard
              statement={statement.data}
              loading={statement.isLoading}
              failed={statement.isError}
            />
          ) : null}

          {health ? <MedicalCard health={health} /> : null}

          {checklist.data && !checklist.data.complete ? (
            <MissingCard items={checklist.data.items} />
          ) : null}

          <PlatformCard
            levelServed={class_name}
            signedIn={Boolean(student.ai_platform_user_ref)}
            firstName={student.first_name}
          />
        </div>
      </div>

      {enrolment ? (
        <ChangeClassDialog
          open={moving}
          onClose={() => setMoving(false)}
          studentId={studentId}
          enrolment={{
            id: enrolment.id,
            academic_year_id: enrolment.academic_year_id,
            class_group_id: enrolment.class_group_id,
            residency: enrolment.residency,
            uses_transport: enrolment.uses_transport,
          }}
        />
      ) : null}
    </>
  );
}

function BackLink() {
  return (
    <Link
      to="/students"
      className="mb-3.5 inline-flex items-center gap-1.5 text-[13px] font-medium text-ok-ink no-underline hover:text-brand-ink"
    >
      <ChevronDownIcon width={14} height={14} className="rotate-90" />
      All students
    </Link>
  );
}

function Fact({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div>
      <dt className="inline text-muted">{label}</dt>{' '}
      <dd className="m-0 inline font-medium">{value}</dd>
    </div>
  );
}
