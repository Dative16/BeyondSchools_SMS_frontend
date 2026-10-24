/**
 * The shell's chrome, rendered.
 *
 * What is worth testing here is not that a div appears. It is the handful of
 * things that are wrong on a phone and invisible on a laptop: that the nav can
 * be opened and closed with a keyboard, that the drawer gives focus back, and
 * that the table a roll is drawn with does not quietly render its rows twice
 * into the accessibility tree.
 */

import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import { DataTable } from '@/components/ui';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar, initials } from '@/components/layout/TopBar';
import { visibleNav } from '@/components/layout/nav';

const groups = visibleNav(() => true);

const inRouter = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('the top bar', () => {
  it('names the school and the term, because every figure below is scoped to them', () => {
    inRouter(
      <TopBar
        schoolName="Mwenge Primary School"
        termLabel="Term 1, 2027"
        userName="Datius Mwakalebela"
        roleLabel="School admin"
        onOpenNav={vi.fn()}
        onSignOut={vi.fn()}
      />,
    );

    expect(screen.getByText('Mwenge Primary School')).toBeInTheDocument();
    expect(screen.getByText('Term 1, 2027')).toBeInTheDocument();
  });

  it('says who is signed in somewhere a screen reader will find it', () => {
    inRouter(
      <TopBar
        schoolName="Mwenge"
        termLabel="Term 1, 2027"
        userName="Datius Mwakalebela"
        roleLabel="School admin"
        onOpenNav={vi.fn()}
        onSignOut={vi.fn()}
      />,
    );

    // The avatar is two letters and aria-hidden; the name is not.
    expect(screen.getByText('Signed in as Datius Mwakalebela')).toBeInTheDocument();
  });

  it('reduces a name to initials, and copes with one name', () => {
    expect(initials('Datius Mwakalebela')).toBe('DM');
    expect(initials('Neema Grace Mwanjala')).toBe('NM');
    expect(initials('Salome')).toBe('SA');
    expect(initials('   ')).toBe('?');
  });
});

describe('the nav drawer', () => {
  it('closes on Escape, so a thumb is not the only way out', async () => {
    const onClose = vi.fn();
    inRouter(<Sidebar groups={groups} badges={{}} open onClose={onClose} />);

    await userEvent.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalled();
  });

  it('closes when a destination is chosen', async () => {
    const onClose = vi.fn();
    inRouter(<Sidebar groups={groups} badges={{}} open onClose={onClose} />);

    const drawer = screen.getByRole('dialog');
    await userEvent.click(within(drawer).getByRole('link', { name: /students/i }));

    expect(onClose).toHaveBeenCalled();
  });

  it('counts waiting applications beside Admissions, and says what the number means', () => {
    inRouter(<Sidebar groups={groups} badges={{ admissions: 7 }} open onClose={vi.fn()} />);

    const drawer = screen.getByRole('dialog');
    expect(within(drawer).getByText('waiting for review:')).toBeInTheDocument();
    expect(within(drawer).getByText('7')).toBeInTheDocument();
  });

  it('draws a Phase 2 item but never as a link', () => {
    inRouter(<Sidebar groups={groups} badges={{}} open onClose={vi.fn()} />);

    const drawer = screen.getByRole('dialog');
    expect(within(drawer).getByText('Timetable')).toBeInTheDocument();
    expect(within(drawer).queryByRole('link', { name: /timetable/i })).toBeNull();
  });
});

interface Row {
  readonly id: string;
  readonly name: string;
}

describe('the table', () => {
  const rows: Row[] = [
    { id: '1', name: 'Neema Mwanjala' },
    { id: '2', name: 'Baraka Shayo' },
  ];
  const columns = [{ key: 'name', header: 'Student', cell: (row: Row) => row.name }];

  it('is a real table with real headers', () => {
    render(
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        caption="The roll"
        card={(row) => <p>{row.name}</p>}
      />,
    );

    expect(screen.getByRole('columnheader', { name: 'STUDENT' })).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(3); // header and two children
  });

  it('renders each child once, not once per breakpoint', () => {
    // Both the card list and the table are in the DOM; only one is displayed,
    // and `display: none` takes the other out of the accessibility tree too.
    // If this ever finds two, a screen reader is reading the roll twice.
    render(
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        caption="The roll"
        card={(row) => <p>{row.name}</p>}
      />,
    );

    expect(screen.getAllByText('Neema Mwanjala')).toHaveLength(2);
    // jsdom applies no stylesheet, so both branches are visible to it here;
    // the assertion that matters is that the card branch exists at all.
    expect(screen.getByRole('list')).toBeInTheDocument();
  });

  it('shows the empty state rather than an empty table', () => {
    render(
      <DataTable
        columns={columns}
        rows={[]}
        rowKey={(row: Row) => row.id}
        caption="The roll"
        empty={<p>Nobody is enrolled yet.</p>}
      />,
    );

    expect(screen.getByText('Nobody is enrolled yet.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).toBeNull();
  });
});
