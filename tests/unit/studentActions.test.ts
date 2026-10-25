import { describe, expect, it } from 'vitest';

import { ApiError } from '@/api/client';
import { fieldOf, messageOf } from '@/features/students/hooks/useStudentActions';

const form = (entries: Record<string, string | File>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.append(key, value);
  return data;
};

describe('reading a field out of a form', () => {
  it('trims, because a trailing space in a surname is invisible forever after', () => {
    expect(fieldOf(form({ surname: '  Mwanjala  ' }), 'surname')).toBe('Mwanjala');
  });

  it('treats blank as not set rather than as an empty name', () => {
    expect(fieldOf(form({ middle_name: '   ' }), 'middle_name')).toBeNull();
    expect(fieldOf(form({}), 'middle_name')).toBeNull();
  });

  it('refuses a File rather than saving "[object File]" as a name', () => {
    // FormData.get returns string | File | null. Stringifying the second one
    // produces something that looks like a value and saves without complaint.
    const data = form({ middle_name: new File(['x'], 'scan.png') });
    expect(fieldOf(data, 'middle_name')).toBeNull();
  });
});

describe('what a failed save says', () => {
  it('prefers the server’s own sentence', () => {
    const error = new ApiError(422, 'that child already has an open enrolment');
    expect(messageOf(error, 'That did not save.')).toBe(
      'that child already has an open enrolment',
    );
  });

  it('falls back when the network simply went away', () => {
    expect(messageOf(new TypeError('Failed to fetch'), 'That did not save.')).toBe(
      'That did not save.',
    );
  });
});
