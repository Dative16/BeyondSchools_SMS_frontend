/**
 * The dashboard, as the Main artboard draws it.
 *
 * Four tiles, an attention list, the payments that came in, and the admissions
 * funnel. Nothing here decides anything — `useDashboard` has already turned
 * seven reads into a view model, and this file is the markup that renders it.
 *
 * What a role cannot see is absent rather than empty. A class teacher opening
 * this gets the greeting and the funnel and no money at all, because a tile
 * reading "TZS 0" would be a wrong answer rather than a withheld one.
 */

import { useMemo } from 'react';

import { PlusIcon } from '@/components/icons';
import {
  ButtonLink,
  Card,
  CardHeader,
  DataTable,
  EmptyState,
  ErrorState,
  StatTile,
  Unit,
} from '@/components/ui';
import type { Column } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { useDashboard } from '@/features/dashboard/hooks/useDashboard';
import { amount, compactMoney, longDate } from '@/lib/format';

import { AttentionList } from './components/AttentionList';
import { Funnel } from './components/Funnel';

type Payment = ReturnType<typeof useDashboard>['payments']['rows'][number];

export default function DashboardPage() {
  const { principal, can } = useAuth();
  const view = useDashboard(principal?.full_name ?? '', can);
  const { tiles } = view;

  const columns = useMemo<readonly Column<Payment>[]>(
    () => [
      {
        key: 'student',
        header: 'Student',
        nowrap: true,
        cell: (row) => (
          <span className="font-medium">{row.student_name ?? 'Not matched'}</span>
        ),
      },
      {
        key: 'class',
        header: 'Class',
        nowrap: true,
        cell: (row) => <span className="text-muted">{row.class_name ?? '—'}</span>,
      },
      {
        key: 'amount',
        header: 'Amount',
        align: 'right',
        nowrap: true,
        cell: (row) => <span className="font-semibold">{amount(Number(row.amount))}</span>,
      },
      {
        key: 'channel',
        header: 'Channel',
        nowrap: true,
        cell: (row) => (
          <span className="text-[12.5px] text-muted">
            {channelName(row.channel)}, {timeOf(row.received_at)}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3.5">
        <div>
          <h1 className="m-0 mb-1 font-display text-[26px] font-semibold tracking-[-0.02em]">
            {view.greeting}
          </h1>
          <p className="m-0 text-sm text-muted">
            {longDate(view.today.toISOString())}
            {view.termLine ? ` · ${view.termLine}` : null}
          </p>
        </div>
        {can('student:manage') ? (
          <ButtonLink to="/students/new" variant="primary">
            <PlusIcon width={15} height={15} />
            Enrol a student
          </ButtonLink>
        ) : null}
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.enrolled.shown ? (
          <StatTile
            label="Enrolled students"
            value={tiles.enrolled.value ?? 0}
            loading={tiles.enrolled.loading}
            foot="On the roll for the current year"
          />
        ) : null}

        {tiles.money.shown ? (
          <>
            <StatTile
              label="Fees collected"
              value={
                <>
                  {compactMoney(tiles.money.settled)}
                  <Unit> TZS</Unit>
                </>
              }
              loading={tiles.money.loading}
              progress={tiles.money.percent}
              foot={`${tiles.money.percent}% of ${compactMoney(tiles.money.billed)} billed`}
            />
            <StatTile
              label="Outstanding arrears"
              value={
                <>
                  {compactMoney(tiles.money.overdue)}
                  <Unit> TZS</Unit>
                </>
              }
              loading={tiles.money.loading}
              footTone={tiles.money.over60 > 0 ? 'bad' : 'muted'}
              foot={arrearsFoot(tiles.money.inArrears, tiles.money.over60)}
            />
          </>
        ) : null}

        {tiles.waiting.shown ? (
          <StatTile
            label="Applications waiting"
            value={tiles.waiting.value ?? 0}
            loading={tiles.waiting.loading}
            footTone={tiles.waiting.oldestDays >= 7 ? 'warn' : 'muted'}
            foot={
              (tiles.waiting.value ?? 0) > 0
                ? `Oldest waiting ${tiles.waiting.oldestDays} ${
                    tiles.waiting.oldestDays === 1 ? 'day' : 'days'
                  }`
                : 'Nothing in the queue'
            }
          />
        ) : null}
      </div>

      <div className="flex flex-wrap gap-4.5">
        <Card className="min-w-0 flex-[1_1_330px]">
          <CardHeader title="Needs your attention" />
          <AttentionList items={view.attention} loading={view.attentionLoading} />
        </Card>

        {view.payments.shown ? (
          <Card className="min-w-0 flex-[1.4_1_420px]">
            <CardHeader title="Payments received" action={{ label: 'See all', to: '/fees' }} />
            {view.payments.failed ? (
              <ErrorState detail="The payments feed did not load. Nothing was changed." />
            ) : (
              <DataTable
                columns={columns}
                rows={view.payments.rows}
                rowKey={(row) => row.id}
                caption="The most recent money received, newest first"
                loading={view.payments.loading}
                empty={
                  <EmptyState
                    title="No payments yet"
                    note="Money a bursar records against an invoice appears here."
                  />
                }
                card={(row) => <PaymentCard row={row} />}
              />
            )}
          </Card>
        ) : null}
      </div>

      {view.funnel.shown ? (
        <Card className="mt-4.5">
          <CardHeader
            title="Admissions funnel"
            note="A deposit payment is what converts an application into an enrolment."
          />
          <Funnel steps={view.funnel.steps} loading={view.funnel.loading} />
        </Card>
      ) : null}
    </>
  );
}

function PaymentCard({ row }: { readonly row: Payment }) {
  return (
    <div className="rounded-[10px] border border-line p-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="m-0 text-sm font-semibold">{row.student_name ?? 'Not matched'}</p>
        <p className="m-0 text-sm font-semibold">{amount(Number(row.amount))}</p>
      </div>
      <p className="mt-1 mb-0 text-xs text-muted">
        {row.class_name ?? 'No class'} · {channelName(row.channel)}, {timeOf(row.received_at)}
      </p>
    </div>
  );
}

const CHANNELS: Record<string, string> = {
  mpesa: 'M-Pesa',
  airtel_money: 'Airtel Money',
  mixx: 'Mixx by Yas',
  halopesa: 'HaloPesa',
  bank: 'Bank',
  card: 'Card',
  counter: 'At the counter',
};

const channelName = (channel: string): string => CHANNELS[channel] ?? channel;

/** 06:12, in the school's own time rather than the browser's. */
const timeOf = (iso: string): string =>
  new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Africa/Dar_es_Salaam',
  }).format(new Date(iso));

function arrearsFoot(inArrears: number, over60: number): string {
  if (inArrears === 0) return 'Nothing overdue';
  const children = `${inArrears} ${inArrears === 1 ? 'student' : 'students'}`;
  return over60 > 0 ? `${children}, ${over60} over 60 days` : children;
}
