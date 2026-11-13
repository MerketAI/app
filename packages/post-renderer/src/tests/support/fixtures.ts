/**
 * The stress matrix the renderer must survive.
 *
 * Every case here exists because it is a way real tenant data breaks a fixed
 * canvas: an address that runs to four lines, a practice name longer than the
 * zone, a profile with no website, a script the display font does not cover.
 *
 * Assets are inline and deterministic on purpose. A test that reaches Pexels or
 * Iconify is a test that fails when a third party rate-limits, and one whose
 * baseline changes when they re-encode an image. The only remaining network
 * dependency is the webfont import, which the harness checks explicitly rather
 * than silently measuring fallback metrics.
 */
import { FormatId, SlotValue } from '../../schema/types';
import { VerifiedProfile } from '../../schema/protected-fields';

const svgDataUri = (svg: string) =>
  `data:image/svg+xml;base64,${Buffer.from(svg, 'utf-8').toString('base64')}`;

/** Stands in for a stock photograph: fixed bytes, no licence, no CDN. */
export const HERO_IMAGE = svgDataUri(
  `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1100" viewBox="0 0 1600 1100">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#cbd5e1"/><stop offset="1" stop-color="#64748b"/>
    </linearGradient></defs>
    <rect width="1600" height="1100" fill="url(#g)"/>
    <circle cx="520" cy="430" r="210" fill="#f8fafc" opacity="0.55"/>
    <rect x="820" y="520" width="620" height="380" rx="36" fill="#0f172a" opacity="0.25"/>
  </svg>`,
);

/** Stands in for a practitioner cutout: transparent, portrait proportions. */
export const CUTOUT_IMAGE = svgDataUri(
  `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1120" viewBox="0 0 720 1120">
    <ellipse cx="360" cy="250" rx="165" ry="190" fill="#1f2937"/>
    <path d="M110 1120 C130 700 240 470 360 470 C480 470 590 700 610 1120 Z" fill="#111827"/>
  </svg>`,
);

const icon = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24">${body}</svg>`;

/**
 * Inline icon set. The shapes are crude; what matters for these tests is that
 * an icon has intrinsic dimensions, which is the property that previously made
 * Iconify markup overflow the box the layout gave it.
 */
export const ICONS: Record<string, string> = {
  dental: icon('<circle cx="12" cy="12" r="9" fill="currentColor"/>'),
  whitening: icon('<path d="M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="currentColor"/>'),
  aligners: icon('<rect x="4" y="4" width="16" height="16" rx="5" fill="currentColor"/>'),
  implants: icon('<path d="M12 3l8 4v6c0 5-4 7-8 8-4-1-8-3-8-8V7z" fill="currentColor"/>'),
  rootcanal: icon('<path d="M5 4h14v4H5zM9 8h6v12H9z" fill="currentColor"/>'),
  clinicName: icon('<circle cx="12" cy="12" r="9" fill="currentColor"/>'),
  address: icon(
    '<path d="M12 2a7 7 0 017 7c0 5-7 13-7 13S5 14 5 9a7 7 0 017-7z" fill="currentColor"/>',
  ),
  phone: icon(
    '<path d="M4 3h5l2 5-3 2a12 12 0 006 6l2-3 5 2v5h-3A14 14 0 014 6z" fill="currentColor"/>',
  ),
  email: icon('<path d="M2 5h20v14H2z" fill="currentColor"/>'),
  website: icon(
    '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/>',
  ),
};

// ---------------------------------------------------------------------------
// Profiles. Fictional, with reserved .example domains so nothing here can be
// mistaken for - or route to - a real practice.
// ---------------------------------------------------------------------------

export const PROFILES: Record<string, VerifiedProfile> = {
  typical: {
    profileVersion: 'fixture-typical-1',
    clinicName: 'SmileCraft Dental Studio',
    doctorName: 'Dr. Kavita Rao',
    qualifications: 'BDS, MDS (Prosthodontics)',
    specialty: 'Cosmetic and Restorative Dentistry',
    phone: '+91 98765 43210',
    email: 'hello@smilecraft.example',
    website: 'https://www.smilecraft.example',
    address:
      '2nd Floor, 14 Jyoti Nivas College Road, 5th Block, Koramangala, Bengaluru 560095',
  },

  // The failure this case comes from: a Delhi address with a landmark, a block,
  // a shop number and a PIN runs well past three lines.
  longAddress: {
    profileVersion: 'fixture-long-address-1',
    clinicName: 'Gupta Child Health and Diagnostics',
    doctorName: 'Dr. Mohit Gupta',
    qualifications: 'MBBS, MD (Paediatrics), Fellowship in Neonatology',
    specialty: 'Paediatrics and Neonatal Care',
    phone: '+91 85868 98752',
    email: 'appointments@childhealthdiagnostics.example',
    website: 'https://www.childhealthdiagnostics.example',
    address:
      'Shop No. 1, Ground Floor, Gupta Diagnostic Centre, Opposite Babu Jagjivan Ram Memorial Hospital, Block E-4, Jahangirpuri, North West Delhi, Delhi 110033, India',
  },

  // Multi-specialty practices routinely have names and post-nominals longer
  // than any zone a designer would draw for them.
  longName: {
    profileVersion: 'fixture-long-name-1',
    clinicName:
      'Shree Venkateshwara Multi-Speciality Dental and Maxillofacial Centre',
    doctorName: 'Dr. Lakshmi Narasimhan Venkataraghavan',
    qualifications:
      'BDS, MDS (Oral and Maxillofacial Surgery), FICOI (USA), Dip. Implantology (Germany)',
    specialty: 'Oral and Maxillofacial Surgery',
    phone: '+91 44 2345 6789 / +91 99400 11223',
    email: 'frontdesk@venkateshwaradentalcentre.example',
    website: 'https://www.venkateshwaradentalcentre.example',
    address: '7 Dr Radhakrishnan Salai, Mylapore, Chennai 600004',
  },

  // A solo practitioner with a phone and nothing else. Every optional field
  // absent at once is the case a template only looks right without.
  sparse: {
    profileVersion: 'fixture-sparse-1',
    clinicName: 'Anand Dental Care',
    phone: '+91 90000 11111',
  },
};

// ---------------------------------------------------------------------------
// Campaign content.
// ---------------------------------------------------------------------------

const ENGLISH_SERVICES = [
  { label: 'Scaling and polishing', icon: 'dental' },
  { label: 'Teeth whitening', icon: 'whitening' },
  { label: 'Clear aligners', icon: 'aligners' },
  { label: 'Implants and crowns', icon: 'implants' },
  { label: 'Root canal therapy', icon: 'rootcanal' },
];

const HINDI_SERVICES = [
  { label: 'दाँतों की सफाई', icon: 'dental' },
  { label: 'दाँत चमकाना', icon: 'whitening' },
  { label: 'पारदर्शी अलाइनर', icon: 'aligners' },
  { label: 'इम्प्लांट और क्राउन', icon: 'implants' },
  { label: 'रूट कैनाल उपचार', icon: 'rootcanal' },
];

export const CONTENT: Record<string, Record<string, SlotValue>> = {
  typical: {
    heroImage: { kind: 'image', assetId: 'fixture-hero', url: HERO_IMAGE },
    headline: {
      kind: 'richtext',
      runs: [{ text: 'Confident smiles' }, { text: 'start here', emphasis: true }],
    },
    subheadline: {
      kind: 'text',
      value: 'Gentle, modern dentistry for the whole family in Koramangala.',
    },
    servicesTitle: { kind: 'text', value: 'What we do' },
    services: { kind: 'list', items: ENGLISH_SERVICES },
    cta: { kind: 'text', value: 'Book your check-up' },
    photoCredit: { kind: 'text', value: 'Illustration: in-house' },
    timings: {
      kind: 'keyvalue',
      items: [
        { label: 'Mon - Sat', value: '9:30 am - 8:00 pm' },
        { label: 'Sunday', value: '10:00 am - 1:00 pm' },
      ],
    },
    badges: {
      kind: 'list',
      items: [
        { label: 'Sterilised' },
        { label: 'Digital X-ray' },
        { label: 'Same-day crowns' },
      ],
    },
  },

  // Devanagari has taller ascenders and a head line, and no coverage in the
  // display faces, so it falls back to a system face with different metrics.
  hindi: {
    heroImage: { kind: 'image', assetId: 'fixture-hero', url: HERO_IMAGE },
    headline: {
      kind: 'richtext',
      runs: [
        { text: 'आत्मविश्वास से भरी' },
        { text: 'मुस्कान', emphasis: true },
      ],
    },
    subheadline: {
      kind: 'text',
      value: 'कोरमंगला में पूरे परिवार के लिए आधुनिक और सौम्य दंत चिकित्सा।',
    },
    servicesTitle: { kind: 'text', value: 'हमारी सेवाएँ' },
    services: { kind: 'list', items: HINDI_SERVICES },
    cta: { kind: 'text', value: 'अपॉइंटमेंट बुक करें' },
    timings: {
      kind: 'keyvalue',
      items: [
        { label: 'सोम - शनि', value: 'सुबह 9:30 - रात 8:00' },
        { label: 'रविवार', value: 'सुबह 10:00 - दोपहर 1:00' },
      ],
    },
  },

  /** Only what the templates mark required. Everything optional is absent. */
  minimal: {
    heroImage: { kind: 'image', assetId: 'fixture-hero', url: HERO_IMAGE },
    headline: { kind: 'richtext', runs: [{ text: 'Open for appointments' }] },
    services: {
      kind: 'list',
      items: [{ label: 'General dentistry', icon: 'dental' }],
    },
  },

  /** An event announcement: occasion, date/venue panel, named practitioner. */
  event: {
    eyebrow: { kind: 'text', value: 'Free dental camp' },
    headline: {
      kind: 'richtext',
      runs: [{ text: 'A free check-up for' }, { text: 'every child', emphasis: true }],
    },
    subheadline: {
      kind: 'text',
      value: 'Screening, cleaning advice and a fluoride application, at no charge.',
    },
    details: {
      kind: 'keyvalue',
      items: [
        { label: 'Date', value: 'Saturday 14 March' },
        { label: 'Time', value: '9:00 am - 2:00 pm' },
        { label: 'Venue', value: 'Koramangala Community Hall' },
      ],
    },
    highlights: {
      kind: 'list',
      items: [
        { label: 'Free screening', icon: 'dental' },
        { label: 'All ages', icon: 'implants' },
        { label: 'No booking', icon: 'whitening' },
      ],
    },
    cta: { kind: 'text', value: 'Just walk in' },
  },

  /** The same layout with only what it requires, to prove the stack closes up. */
  eventMinimal: {
    headline: { kind: 'richtext', runs: [{ text: 'Clinic closed on Monday' }] },
  },

  /** With a cutout supplied, which the square layout stands over the seam. */
  withCutout: {
    heroImage: { kind: 'image', assetId: 'fixture-hero', url: HERO_IMAGE },
    cutout: { kind: 'image', assetId: 'fixture-cutout', url: CUTOUT_IMAGE },
    headline: {
      kind: 'richtext',
      runs: [{ text: 'Meet your' }, { text: 'dentist', emphasis: true }],
    },
    subheadline: { kind: 'text', value: 'Twelve years of restorative practice.' },
    services: { kind: 'list', items: ENGLISH_SERVICES.slice(0, 3) },
    cta: { kind: 'text', value: 'Book a consultation' },
  },

  /**
   * Deliberately unfittable: far past every declared maxChars, with more list
   * items than the slot accepts. Its purpose is to prove the overflow report
   * is not vacuously passing - if this case comes back clean, the harness is
   * measuring nothing.
   */
  overflowing: {
    heroImage: { kind: 'image', assetId: 'fixture-hero', url: HERO_IMAGE },
    headline: {
      kind: 'richtext',
      runs: [
        {
          text: 'Comprehensive multi-disciplinary dental, orthodontic, periodontal and maxillofacial rehabilitation for every member of your family',
        },
        {
          text: 'available seven days a week at both of our centres',
          emphasis: true,
        },
      ],
    },
    subheadline: {
      kind: 'text',
      value:
        'Including scaling, polishing, bleaching, veneers, inlays, onlays, full-mouth rehabilitation, sedation dentistry, paediatric care, geriatric care and emergency walk-in appointments until midnight.',
    },
    servicesTitle: {
      kind: 'text',
      value: 'Everything that we are able to do for you',
    },
    services: {
      kind: 'list',
      items: [
        { label: 'Full-mouth rehabilitation under sedation', icon: 'dental' },
        { label: 'Computer-guided implant placement', icon: 'implants' },
        { label: 'Invisible orthodontic aligner therapy', icon: 'aligners' },
        { label: 'Professional in-chair tooth whitening', icon: 'whitening' },
        { label: 'Single-visit root canal treatment', icon: 'rootcanal' },
        { label: 'Paediatric preventive dentistry', icon: 'dental' },
        { label: 'Periodontal flap surgery and grafting', icon: 'implants' },
        { label: 'Maxillofacial trauma reconstruction', icon: 'implants' },
      ],
    },
    cta: { kind: 'text', value: 'Call now to reserve an appointment slot' },
  },
};

export interface StressCase {
  /** Stable name: it is both the baseline filename and the test title. */
  name: string;
  templateId: string;
  format: FormatId;
  profile: keyof typeof PROFILES;
  content: keyof typeof CONTENT;
  /** True for the control case that is supposed to fail to fit. */
  expectOverflow?: boolean;
}

export const STRESS_CASES: StressCase[] = [
  // --- the square social post ---
  {
    name: 'square-typical',
    templateId: 'photo-hero-01',
    format: 'instagram_square',
    profile: 'typical',
    content: 'typical',
  },
  {
    name: 'square-hindi',
    templateId: 'photo-hero-01',
    format: 'instagram_square',
    profile: 'typical',
    content: 'hindi',
  },
  {
    name: 'square-long-name',
    templateId: 'photo-hero-01',
    format: 'instagram_square',
    profile: 'longName',
    content: 'typical',
  },
  {
    name: 'square-long-address',
    templateId: 'photo-hero-01',
    format: 'instagram_square',
    profile: 'longAddress',
    content: 'typical',
  },
  {
    name: 'square-sparse',
    templateId: 'photo-hero-01',
    format: 'instagram_square',
    profile: 'sparse',
    content: 'minimal',
  },
  {
    name: 'square-cutout',
    templateId: 'photo-hero-01',
    format: 'instagram_square',
    profile: 'typical',
    content: 'withCutout',
  },
  {
    name: 'portrait-typical',
    templateId: 'photo-hero-01',
    format: 'instagram_portrait',
    profile: 'typical',
    content: 'typical',
  },
  {
    name: 'portrait-hindi',
    templateId: 'photo-hero-01',
    format: 'instagram_portrait',
    profile: 'typical',
    content: 'hindi',
  },

  // --- the event notice: the social layout that needs no photograph ---
  {
    name: 'event-square',
    templateId: 'event-notice-01',
    format: 'instagram_square',
    profile: 'typical',
    content: 'event',
  },
  {
    name: 'event-portrait',
    templateId: 'event-notice-01',
    format: 'instagram_portrait',
    profile: 'typical',
    content: 'event',
  },
  {
    name: 'event-hindi',
    templateId: 'event-notice-01',
    format: 'instagram_square',
    profile: 'typical',
    content: 'hindi',
  },
  {
    name: 'event-long-name',
    templateId: 'event-notice-01',
    format: 'instagram_square',
    profile: 'longName',
    content: 'event',
  },
  {
    name: 'event-sparse',
    templateId: 'event-notice-01',
    format: 'instagram_square',
    profile: 'sparse',
    content: 'eventMinimal',
  },

  // --- the A4 clinic profile ---
  {
    name: 'a4-typical',
    templateId: 'clinic-profile-01',
    format: 'a4_portrait',
    profile: 'typical',
    content: 'typical',
  },
  {
    name: 'a4-hindi',
    templateId: 'clinic-profile-01',
    format: 'a4_portrait',
    profile: 'typical',
    content: 'hindi',
  },
  {
    name: 'a4-long-address',
    templateId: 'clinic-profile-01',
    format: 'a4_portrait',
    profile: 'longAddress',
    content: 'typical',
  },
  {
    name: 'a4-long-name',
    templateId: 'clinic-profile-01',
    format: 'a4_portrait',
    profile: 'longName',
    content: 'typical',
  },
  {
    name: 'a4-sparse',
    templateId: 'clinic-profile-01',
    format: 'a4_portrait',
    profile: 'sparse',
    content: 'minimal',
  },

  // --- the controls: these must be reported as not fitting ---
  {
    name: 'square-overflowing',
    templateId: 'photo-hero-01',
    format: 'instagram_square',
    profile: 'longName',
    content: 'overflowing',
    expectOverflow: true,
  },
  {
    name: 'a4-overflowing',
    templateId: 'clinic-profile-01',
    format: 'a4_portrait',
    profile: 'longName',
    content: 'overflowing',
    expectOverflow: true,
  },
];
