/**
 * The table.
 *
 * A real `<table>` with real `<th scope>`, because the roll and the fees list
 * are tabular data and a grid of divs loses the row and column a cell belongs
 * to the moment anybody navigates it with anything but a mouse.
 *
 * It renders twice over, and that is the point. At `sm` and up it is the table
 * the design draws. Below that each row becomes a card, because a 470-child
 * roll inside a horizontally scrolling box on a 360px phone is data you cannot
 * read without losing your place — and the phone is where most of this app is
 * used. Only one of the two is ever in the accessibility tree: `display: none`
 * hides the other from a screen reader as well as from the eye.
 *
 * A caller without a `card` render function gets the scrolling box instead,
 * which is the right answer for a short, narrow table.
 */

import type { ReactNode } from 'react';

export interface Column<Row> {
  readonly key: string;
  readonly header: string;
  readonly cell: (row: Row) => ReactNode;
  readonly align?: 'left' | 'right';
  /** Keeps a figure or a date from wrapping mid-value. */
  readonly nowrap?: boolean;
}

interface Props<Row> {
  readonly columns: readonly Column<Row>[];
  readonly rows: readonly Row[];
  readonly rowKey: (row: Row) => string;
  /** Describes the table for anyone who cannot see its shape. */
  readonly caption: string;
  /** Hide the caption visually when the card header above already says it. */
  readonly captionHidden?: boolean;
  /** The phone-width rendering of one row. Without it, the table scrolls. */
  readonly card?: (row: Row) => ReactNode;
  readonly onRowClick?: (row: Row) => void;
  readonly empty?: ReactNode;
  readonly loading?: boolean;
  /** Tints the header row, as the roll does and the dashboard's table does not. */
  readonly tintHeader?: boolean;
}

const headCell =
  'pb-2 pr-2.5 text-left text-[11px] font-semibold tracking-[0.05em] text-muted border-b border-line';

export function DataTable<Row>({
  columns,
  rows,
  rowKey,
  caption,
  captionHidden = false,
  card,
  onRowClick,
  empty,
  loading = false,
  tintHeader = false,
}: Props<Row>) {
  if (loading) return <TableSkeleton columns={columns.length} />;
  if (rows.length === 0 && empty) return <>{empty}</>;

  const table = (
    <table className="w-full border-collapse">
      <caption
        className={
          captionHidden ? 'sr-only' : 'pb-2.5 text-left text-xs text-muted'
        }
      >
        {caption}
      </caption>
      <thead>
        <tr className={tintHeader ? 'bg-canvas' : undefined}>
          {columns.map((column) => (
            <th
              key={column.key}
              scope="col"
              className={`${headCell} ${tintHeader ? 'border-t border-line px-3.5 py-2.5' : ''} ${
                column.align === 'right' ? 'text-right' : ''
              }`}
            >
              {column.header.toUpperCase()}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={rowKey(row)}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            className={onRowClick ? 'cursor-pointer hover:bg-canvas' : undefined}
          >
            {columns.map((column) => (
              <td
                key={column.key}
                className={`border-b border-line-soft py-[11px] pr-2.5 text-[13px] ${
                  column.align === 'right' ? 'text-right' : ''
                } ${column.nowrap ? 'whitespace-nowrap' : ''}`}
              >
                {column.cell(row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );

  if (!card) return <div className="overflow-x-auto">{table}</div>;

  return (
    <>
      <ul className="m-0 flex list-none flex-col gap-2.5 p-0 sm:hidden">
        {rows.map((row) => (
          <li key={rowKey(row)}>{card(row)}</li>
        ))}
      </ul>
      <div className="hidden overflow-x-auto sm:block">{table}</div>
    </>
  );
}

function TableSkeleton({ columns }: { readonly columns: number }) {
  return (
    <div className="flex flex-col gap-2.5" aria-hidden="true">
      {Array.from({ length: 5 }, (_, row) => (
        <div key={row} className="flex gap-3">
          {Array.from({ length: columns }, (_, column) => (
            <div key={column} className="h-4 flex-1 animate-pulse rounded bg-line-soft" />
          ))}
        </div>
      ))}
      <span className="sr-only">Loading</span>
    </div>
  );
}
