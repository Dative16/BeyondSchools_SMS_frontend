/**
 * Domain types written by hand where the API's generated schema is not enough.
 * Generated types live in src/api/schema.d.ts — run `npm run types`.
 *
 * The distinction the whole data model rests on: a Student is a person, an
 * Enrolment is that person in one class for one academic year. Nothing in this
 * app should put a class on a Student.
 */

import type { components } from '@/api/schema';

export type UUID = string;

/**
 * What an account may do, straight off the server's own enum. Named here
 * rather than in a feature so a primitive can take one as a prop without
 * reaching into `src/features`.
 */
export type Permission = components['schemas']['Permission'];

export type Role =
  | 'platform_admin'
  | 'school_admin'
  | 'head_of_academics'
  | 'bursar'
  | 'class_teacher'
  | 'subject_teacher'
  | 'guardian'
  | 'student'
  | 'applicant';

export type EnrolmentOutcome =
  | 'active'
  | 'promoted'
  | 'repeated'
  | 'graduated'
  | 'transferred_out'
  | 'withdrawn';

export type FeeState = 'settled' | 'part_paid' | 'in_arrears';

export interface Student {
  id: UUID;
  admissionNo: string;
  firstName: string;
  surname: string;
  dateOfBirth: string;
  sex: 'f' | 'm';
  photoUrl: string | null;
}

export interface Enrolment {
  id: UUID;
  studentId: UUID;
  academicYear: string;
  classGroupId: UUID;
  classGroupName: string;
  outcome: EnrolmentOutcome;
}
