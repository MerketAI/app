/**
 * Facts the Art Director may never author.
 *
 * The model decides *whether* a verified field appears and *where*. It never
 * supplies the value. Every one of these is something a patient acts on or a
 * regulator checks: a hallucinated registration number or a transposed digit in
 * a phone number is not a cosmetic defect, it is a misrepresentation published
 * under a doctor's name.
 *
 * Values for these slots are injected from the verified profile *after*
 * generation, and `validateFacts` rejects any render where the resolved value
 * does not match the profile exactly.
 */
export const PROTECTED_FIELDS = [
  'doctorName',
  'qualifications',
  'registrationNumber',
  'specialty',
  'clinicName',
  'phone',
  'email',
  'website',
  'address',
  'bookingUrl',
] as const;

export type ProtectedField = (typeof PROTECTED_FIELDS)[number];

const PROTECTED_SET: ReadonlySet<string> = new Set(PROTECTED_FIELDS);

/**
 * The subset a ContactBar shows when it is not bound to one specific slot.
 *
 * Identity fields - clinic name, doctor name, qualifications - are rendered in
 * their own zones. Sweeping every profile-sourced slot into the contact bar
 * duplicated the practice name at the foot of the post.
 */
export const CONTACT_FIELDS: readonly ProtectedField[] = [
  'address',
  'phone',
  'email',
  'website',
  'bookingUrl',
];

const CONTACT_SET: ReadonlySet<string> = new Set(CONTACT_FIELDS);

export function isContactField(field: string): boolean {
  return CONTACT_SET.has(field);
}

export function isProtectedField(field: string): field is ProtectedField {
  return PROTECTED_SET.has(field);
}

/**
 * The verified profile, as supplied by the platform - never by a model.
 *
 * Optional fields are genuinely optional: a solo practitioner may have no
 * registration number on file, and a template must cope with that rather than
 * render an empty label.
 */
export interface VerifiedProfile {
  /** Identifies which revision of the profile a render used. */
  profileVersion: string;

  doctorName?: string;
  qualifications?: string;
  registrationNumber?: string;
  specialty?: string;
  clinicName?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  bookingUrl?: string;
}

/** Reads a protected field, normalising blank strings to undefined. */
export function readProtectedField(
  profile: VerifiedProfile,
  field: ProtectedField,
): string | undefined {
  const value = profile[field];
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
