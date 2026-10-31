/**
 * The profile panels, rendered.
 *
 * The one worth the most here is the document upload, because its whole point
 * is invisible from the outside: the file goes from the browser straight to
 * object storage with a presigned ticket and the record is written only after
 * it lands. A test that just checked "a document appeared" would pass against
 * an implementation that posted the bytes through the API, which is exactly
 * what must not happen with a child's birth certificate.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const sent: { path: string; init: RequestInit }[] = [];
const rawFetches: { url: string; init: RequestInit }[] = [];
const opened: string[] = [];

let documents: unknown = [
  {
    id: 'doc-1',
    kind: 'birth_certificate',
    file_url: null,
    file_name: 'cheti.jpg',
    content_type: 'image/jpeg',
    size_bytes: 120_000,
    note: null,
    verified_at: '2027-01-12T08:00:00Z',
    created_at: '2027-01-11T08:00:00Z',
  },
];

const GUARDIANS = [
  {
    link_id: 'l-1',
    guardian_id: 'g-1',
    full_name: 'Asha Mwanjala',
    phone: '0754118902',
    alt_phone: null,
    email: null,
    relationship: 'mother',
    is_primary: true,
    receives_invoices: true,
    receives_sms: true,
    may_collect: true,
    sms_opted_out: false,
  },
];

const FIELDS = [
  {
    id: 'f-1',
    key: 'bus_route',
    label: 'Bus route',
    help_text: 'Only for pupils on the school bus.',
    kind: 'choice',
    scope: 'student',
    options: ['Kimara', 'Mbezi'],
    required_at_registration: false,
    is_sensitive: false,
    is_active: true,
    sort_order: 0,
  },
];

let uploadWorks = true;

vi.mock('@/api/client', () => ({
  api: (path: string, init: RequestInit = {}) => {
    sent.push({ path, init });
    if (path.endsWith('/documents') && init.method !== 'POST')
      return Promise.resolve(documents);
    if (path.endsWith('/documents') && init.method === 'POST')
      return Promise.resolve({ id: 'doc-2', kind: 'passport_photo', created_at: '2027-01-12' });
    if (path.endsWith('/upload-url'))
      return Promise.resolve({
        url: 'https://storage.example/put?sig=abc',
        object_key: 'schools/1/students/2/doc.jpg',
        expires_at: '2027-01-11T08:10:00Z',
        headers: { 'content-type': 'image/jpeg' },
        max_bytes: 10_000_000,
      });
    if (path.includes('/documents/') && path.endsWith('/url'))
      return Promise.resolve({ url: 'https://storage.example/get?sig=xyz', expires_in: 120 });
    if (path.endsWith('/health')) return Promise.resolve(null);
    if (path.endsWith('/emergency-contacts')) return Promise.resolve([]);
    if (path === '/schools/me/fields') return Promise.resolve(FIELDS);
    return Promise.resolve([]);
  },
  ApiError: class extends Error {},
}));

let can: (permission: string) => boolean = () => true;
vi.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => ({ can: (p: string) => can(p), principal: null, signOut: vi.fn() }),
}));

const { ProfilePanels } = await import('@/features/students/components/ProfilePanels');

function show(at = '/students/stu-1') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[at]}>
        <ProfilePanels
          studentId="stu-1"
          guardians={GUARDIANS}
          fieldValues={{ bus_route: 'Kimara' }}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  sent.length = 0;
  rawFetches.length = 0;
  opened.length = 0;
  can = () => true;
  uploadWorks = true;
  documents = [
    {
      id: 'doc-1',
      kind: 'birth_certificate',
      file_url: null,
      file_name: 'cheti.jpg',
      content_type: 'image/jpeg',
      size_bytes: 120_000,
      note: null,
      verified_at: '2027-01-12T08:00:00Z',
      created_at: '2027-01-11T08:00:00Z',
    },
  ];
  vi.stubGlobal('fetch', (url: string, init: RequestInit) => {
    rawFetches.push({ url, init });
    return Promise.resolve({ ok: uploadWorks } as Response);
  });
  vi.stubGlobal('open', (url: string) => {
    opened.push(url);
    return null;
  });
});

describe('documents', () => {
  it('lists what is held and names what is still missing', async () => {
    show();

    expect(await screen.findByText(/cheti\.jpg/)).toBeInTheDocument();
    expect(screen.getByText(/Checked/)).toBeInTheDocument();
    // A passport photograph has not been attached, and a school will not
    // admit without one.
    expect(screen.getByText(/Still needed/)).toBeInTheDocument();
    expect(screen.getByText(/picha ya pasipoti/)).toBeInTheDocument();
  });

  it('uploads to storage directly, and records nothing until it lands', async () => {
    const user = userEvent.setup();
    show();

    await user.click(await screen.findByRole('button', { name: /Attach a document/ }));
    const file = new File(['bytes'], 'picha.jpg', { type: 'image/jpeg' });
    await user.upload(screen.getByLabelText(/File/), file);
    await user.click(screen.getByRole('button', { name: 'Attach it' }));

    // A ticket, then the bytes straight to storage, then the record.
    const ticket = sent.find((call) => call.path.endsWith('/upload-url'));
    expect(ticket).toBeDefined();
    expect(rawFetches).toHaveLength(1);
    expect(rawFetches[0]?.url).toBe('https://storage.example/put?sig=abc');
    expect(rawFetches[0]?.init.method).toBe('PUT');

    // The bytes never went through the API: no call carries a File body.
    for (const call of sent) {
      expect(call.init.body instanceof File).toBe(false);
    }

    const record = sent.find(
      (call) => call.path.endsWith('/documents') && call.init.method === 'POST',
    );
    expect(JSON.parse(record?.init.body as string)).toMatchObject({
      kind: 'passport_photo',
      object_key: 'schools/1/students/2/doc.jpg',
      file_name: 'picha.jpg',
    });
  });

  it('records nothing when the upload does not reach storage', async () => {
    uploadWorks = false;
    const user = userEvent.setup();
    show();

    await user.click(await screen.findByRole('button', { name: /Attach a document/ }));
    await user.upload(
      screen.getByLabelText(/File/),
      new File(['bytes'], 'picha.jpg', { type: 'image/jpeg' }),
    );
    await user.click(screen.getByRole('button', { name: 'Attach it' }));

    expect(await screen.findByText(/did not reach storage/)).toBeInTheDocument();
    expect(
      sent.some((call) => call.path.endsWith('/documents') && call.init.method === 'POST'),
    ).toBe(false);
  });

  it('fetches a fresh link at the moment of the click', async () => {
    const user = userEvent.setup();
    show();

    await user.click(await screen.findByRole('button', { name: 'Open' }));

    // Asked for when wanted, never held: these are children's birth
    // certificates in a private bucket and the link expires in minutes.
    expect(sent.some((call) => call.path.endsWith('/documents/doc-1/url'))).toBe(true);
    expect(opened).toEqual(['https://storage.example/get?sig=xyz']);
  });
});

describe('guardians', () => {
  it('will not let the last guardian be unlinked', async () => {
    const user = userEvent.setup();
    show();
    await user.click(await screen.findByRole('button', { name: /^Guardians/ }));

    expect(await screen.findByText('Asha Mwanjala')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Unlink' })).toBeDisabled();
    // And says why, rather than leaving a dead button.
    expect(screen.getByText(/no invoice address and nobody to telephone/)).toBeInTheDocument();
  });

  it('makes the first guardian on a child the primary one', async () => {
    const user = userEvent.setup();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/students/stu-1?panel=guardians']}>
          <ProfilePanels studentId="stu-1" guardians={[]} fieldValues={{}} />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText(/Nobody is linked to this child/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add a guardian' }));
    await user.type(screen.getByLabelText(/Full name/), 'Asha Mwanjala');
    await user.type(screen.getByLabelText(/Phone number/), '0754118902');
    await user.click(screen.getByRole('button', { name: 'Link them' }));

    const call = sent.find((each) => each.path.endsWith('/guardians') && each.init.method === 'POST');
    const body = JSON.parse(call?.init.body as string) as Record<string, Record<string, unknown>>;
    expect(body.link?.is_primary).toBe(true);
    expect(body.link?.receives_invoices).toBe(true);
  });
});

describe('medical', () => {
  it('is not drawn at all without health access', async () => {
    can = (permission) => permission !== 'health:read';
    show('/students/stu-1?panel=medical');

    // Children's health data is sensitive personal data under the Personal
    // Data Protection Act 2022: not drawn and then refused, not drawn at all.
    expect(await screen.findByRole('button', { name: 'Documents' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Medical' })).toBeNull();
    expect(screen.queryByLabelText(/Allergies/)).toBeNull();
  });

  it('says what the emergency plan is for', async () => {
    show('/students/stu-1?panel=medical');

    expect(await screen.findByLabelText('In an emergency')).toBeInTheDocument();
    expect(screen.getByText(/Write it for a stranger/)).toBeInTheDocument();
  });
});

describe("the school's own fields", () => {
  it('draws a choice field as a choice, with what was recorded', async () => {
    show('/students/stu-1?panel=fields');

    const select = await screen.findByLabelText<HTMLSelectElement>(/Bus route/);
    expect(select.tagName).toBe('SELECT');
    expect(select.value).toBe('Kimara');
    expect(within(select).getByRole('option', { name: 'Mbezi' })).toBeInTheDocument();
    // And an explicit way to say nothing, which is not the same as Kimara.
    expect(within(select).getByRole('option', { name: 'Not set' })).toBeInTheDocument();
  });

  it('sends null rather than an empty string when a field is cleared', async () => {
    const user = userEvent.setup();
    show('/students/stu-1?panel=fields');

    await user.selectOptions(await screen.findByLabelText(/Bus route/), '');
    await user.click(screen.getByRole('button', { name: /Save these details/ }));

    // Not just anything ending in /fields: /schools/me/fields is the
    // definitions and is fetched first.
    const call = sent.find((each) => each.path === '/students/stu-1/fields');
    expect(JSON.parse(call?.init.body as string)).toEqual({ values: { bus_route: null } });
  });
});
