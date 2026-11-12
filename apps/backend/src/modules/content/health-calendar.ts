/**
 * Health awareness days and seasonal health topics for providers in India, so the
 * assistant and the calendar can suggest timely posts. Global WHO/UN days plus
 * India's national days. Dates that move (e.g. "second Thursday of October") are
 * computed per year. Festivals follow the lunar calendar and are left to web search.
 *
 * `focus` lists speciality words a day matters most to; an empty list means every
 * provider. It ranks days, it never hides them.
 */

export interface HealthDay {
  /** YYYY-MM-DD (the first day, for a week or month). */
  date: string;
  /** Last day, for a week or a month. */
  until?: string;
  name: string;
  kind: 'day' | 'week' | 'month';
  scope: 'global' | 'india';
  focus: string[];
}

export interface SeasonalTopic {
  months: number[];
  topic: string;
  note: string;
}

type Rule =
  | { m: number; d: number }
  /** nth (1-5, or -1 for last) weekday (0 = Sunday) of the month. */
  | { m: number; nth: number; weekday: number };

interface Entry {
  rule: Rule;
  /** Length in days for weeks; months are whole months. */
  days?: number;
  name: string;
  kind?: HealthDay['kind'];
  scope?: HealthDay['scope'];
  focus?: string[];
}

const ENTRIES: Entry[] = [
  { rule: { m: 1, d: 4 }, name: 'World Braille Day', focus: ['eye', 'ophthalm', 'optom'] },
  { rule: { m: 1, d: 30 }, name: 'Anti-Leprosy Day', scope: 'india', focus: ['derma', 'skin'] },
  { rule: { m: 1, d: 30 }, name: 'World Neglected Tropical Diseases Day' },
  { rule: { m: 2, d: 4 }, name: 'World Cancer Day', focus: ['onco', 'cancer'] },
  { rule: { m: 2, d: 10 }, name: 'National Deworming Day', scope: 'india', focus: ['paediatric', 'pediatric', 'child'] },
  { rule: { m: 2, d: 15 }, name: 'International Childhood Cancer Day', focus: ['onco', 'paediatric', 'pediatric'] },
  { rule: { m: 3, d: 3 }, name: 'World Hearing Day', focus: ['ent', 'audio', 'ear'] },
  { rule: { m: 3, nth: 2, weekday: 4 }, name: 'World Kidney Day', focus: ['nephro', 'kidney', 'urolog'] },
  { rule: { m: 3, d: 20 }, name: 'World Oral Health Day', focus: ['dent', 'oral'] },
  { rule: { m: 3, d: 21 }, name: 'World Down Syndrome Day', focus: ['paediatric', 'pediatric', 'genetic'] },
  { rule: { m: 3, d: 24 }, name: 'World TB Day', focus: ['pulmo', 'chest', 'respir'] },
  { rule: { m: 4, d: 2 }, name: 'World Autism Awareness Day', focus: ['paediatric', 'pediatric', 'psych', 'therapy', 'neuro'] },
  { rule: { m: 4, d: 7 }, name: 'World Health Day' },
  { rule: { m: 4, d: 11 }, name: 'National Safe Motherhood Day', scope: 'india', focus: ['gyn', 'obst', 'matern'] },
  { rule: { m: 4, d: 17 }, name: 'World Haemophilia Day', focus: ['haemat', 'hemat'] },
  { rule: { m: 4, d: 24 }, days: 7, kind: 'week', name: 'World Immunization Week', focus: ['paediatric', 'pediatric', 'general', 'family'] },
  { rule: { m: 4, d: 25 }, name: 'World Malaria Day' },
  { rule: { m: 5, d: 5 }, name: 'World Hand Hygiene Day' },
  { rule: { m: 5, nth: 1, weekday: 2 }, name: 'World Asthma Day', focus: ['pulmo', 'chest', 'respir', 'allerg'] },
  { rule: { m: 5, d: 8 }, name: 'World Thalassaemia Day', focus: ['haemat', 'hemat', 'lab', 'patholog'] },
  { rule: { m: 5, d: 12 }, name: 'International Nurses Day', focus: ['nurs'] },
  { rule: { m: 5, d: 16 }, name: 'National Dengue Day', scope: 'india' },
  { rule: { m: 5, d: 17 }, name: 'World Hypertension Day', focus: ['cardio', 'heart', 'general', 'physician'] },
  { rule: { m: 5, d: 31 }, name: 'World No Tobacco Day', focus: ['onco', 'pulmo', 'dent', 'oral'] },
  { rule: { m: 6, d: 5 }, name: 'World Environment Day' },
  { rule: { m: 6, d: 7 }, name: 'World Food Safety Day', focus: ['gastro', 'nutri', 'diet'] },
  { rule: { m: 6, d: 14 }, name: 'World Blood Donor Day', focus: ['haemat', 'hemat', 'lab', 'blood'] },
  { rule: { m: 6, d: 21 }, name: 'International Day of Yoga', focus: ['physio', 'ortho', 'wellness'] },
  { rule: { m: 7, d: 1 }, name: "National Doctors' Day", scope: 'india' },
  { rule: { m: 7, d: 11 }, name: 'World Population Day', focus: ['gyn', 'obst'] },
  { rule: { m: 7, d: 28 }, name: 'World Hepatitis Day', focus: ['gastro', 'hepat', 'liver', 'lab'] },
  { rule: { m: 8, d: 1 }, days: 7, kind: 'week', name: 'World Breastfeeding Week', focus: ['gyn', 'obst', 'paediatric', 'pediatric', 'lactat'] },
  { rule: { m: 8, d: 10 }, name: 'National Deworming Day (second round)', scope: 'india', focus: ['paediatric', 'pediatric', 'child'] },
  { rule: { m: 9, d: 1 }, days: 7, kind: 'week', name: 'National Nutrition Week', scope: 'india', focus: ['nutri', 'diet'] },
  { rule: { m: 9, d: 1 }, kind: 'month', name: 'Poshan Maah (National Nutrition Month)', scope: 'india', focus: ['nutri', 'diet', 'paediatric', 'pediatric'] },
  { rule: { m: 9, d: 10 }, name: 'World Suicide Prevention Day', focus: ['psych', 'mental', 'therapy'] },
  { rule: { m: 9, d: 17 }, name: 'World Patient Safety Day' },
  { rule: { m: 9, d: 21 }, name: "World Alzheimer's Day", focus: ['neuro', 'geriat', 'psych'] },
  { rule: { m: 9, d: 25 }, name: "World Pharmacists' Day", focus: ['pharma', 'chemist'] },
  { rule: { m: 9, d: 28 }, name: 'World Rabies Day' },
  { rule: { m: 9, d: 29 }, name: 'World Heart Day', focus: ['cardio', 'heart'] },
  { rule: { m: 10, d: 1 }, kind: 'month', name: 'Breast Cancer Awareness Month', focus: ['onco', 'gyn', 'radiol', 'mammo'] },
  { rule: { m: 10, d: 1 }, name: 'International Day of Older Persons', focus: ['geriat', 'general', 'family'] },
  { rule: { m: 10, nth: 2, weekday: 4 }, name: 'World Sight Day', focus: ['eye', 'ophthalm', 'optom'] },
  { rule: { m: 10, d: 10 }, name: 'World Mental Health Day', focus: ['psych', 'mental', 'therapy'] },
  { rule: { m: 10, d: 12 }, name: 'World Arthritis Day', focus: ['ortho', 'rheuma', 'physio'] },
  { rule: { m: 10, d: 16 }, name: 'World Food Day', focus: ['nutri', 'diet'] },
  { rule: { m: 10, d: 20 }, name: 'World Osteoporosis Day', focus: ['ortho', 'rheuma', 'gyn'] },
  { rule: { m: 10, d: 24 }, name: 'World Polio Day', focus: ['paediatric', 'pediatric'] },
  { rule: { m: 11, d: 1 }, kind: 'month', name: 'Diabetes Awareness Month', focus: ['diabet', 'endocr', 'general', 'physician'] },
  { rule: { m: 11, d: 7 }, name: 'National Cancer Awareness Day', scope: 'india', focus: ['onco', 'cancer'] },
  { rule: { m: 11, d: 12 }, name: 'World Pneumonia Day', focus: ['pulmo', 'chest', 'paediatric', 'pediatric'] },
  { rule: { m: 11, d: 14 }, name: 'World Diabetes Day', focus: ['diabet', 'endocr', 'general', 'physician', 'eye', 'ophthalm'] },
  { rule: { m: 11, d: 14 }, name: "Children's Day", scope: 'india', focus: ['paediatric', 'pediatric', 'child'] },
  { rule: { m: 11, d: 17 }, name: 'World Prematurity Day', focus: ['neonat', 'paediatric', 'pediatric', 'obst'] },
  { rule: { m: 11, d: 18 }, days: 7, kind: 'week', name: 'World AMR Awareness Week', focus: ['pharma', 'general', 'microbio'] },
  { rule: { m: 11, d: 19 }, name: 'World Toilet Day' },
  { rule: { m: 12, d: 1 }, name: 'World AIDS Day' },
  { rule: { m: 12, d: 3 }, name: 'International Day of Persons with Disabilities', focus: ['physio', 'rehab', 'therapy'] },
  { rule: { m: 12, d: 12 }, name: 'Universal Health Coverage Day' },
];

/** Common health themes by month across India; regional differences noted. */
export const SEASONAL_TOPICS: SeasonalTopic[] = [
  { months: [11, 12, 1], topic: 'Air pollution and breathing', note: 'Smog season in North India (Delhi NCR, Punjab, UP): masks, asthma and COPD care, children and elderly.' },
  { months: [12, 1, 2], topic: 'Winter illnesses', note: 'Flu, colds, pneumonia in the elderly, joint pain and heart strain in the cold.' },
  { months: [3, 4, 5, 6], topic: 'Summer heat', note: 'Heatstroke, dehydration, food and water safety, eye and skin protection from the sun.' },
  { months: [6, 7, 8, 9], topic: 'Monsoon illnesses', note: 'Dengue, malaria, chikungunya, typhoid, leptospirosis, fungal skin infections; mosquito and water safety.' },
  { months: [9, 10, 11], topic: 'Post-monsoon dengue peak', note: 'Dengue cases usually peak after the monsoon: warning signs, when to test, platelet myths.' },
  { months: [10, 11], topic: 'Festival season', note: 'Festive eating and blood sugar, firecracker burns and eye injuries, sweets and dental care (check festival dates by web search).' },
  { months: [3, 4], topic: 'Exam season', note: 'Students: sleep, eye strain, stress and nutrition.' },
];

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
const daysIn = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/** The day of the month a rule falls on in a year. */
export function dayOf(rule: Rule, year: number): number {
  if ('d' in rule) return rule.d;
  const first = new Date(Date.UTC(year, rule.m - 1, 1)).getUTCDay();
  const firstMatch = 1 + ((rule.weekday - first + 7) % 7);
  if (rule.nth > 0) return firstMatch + (rule.nth - 1) * 7;
  let last = firstMatch;
  while (last + 7 <= daysIn(year, rule.m)) last += 7;
  return last;
}

function addDays(date: string, n: number): string {
  const t = new Date(`${date}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
}

/**
 * Health days overlapping [from, to] (YYYY-MM-DD, inclusive), sorted by date. With
 * specialities, days that match them come first on the same date.
 */
export function healthDaysBetween(from: string, to: string, specialities: string[] = []): HealthDay[] {
  const words = specialities.map((s) => s.toLowerCase());
  const matches = (focus: string[]) => focus.some((f) => words.some((w) => w.includes(f)));
  const out: Array<HealthDay & { rank: number }> = [];
  const startYear = Number(from.slice(0, 4));
  const endYear = Number(to.slice(0, 4));
  for (let year = startYear; year <= endYear; year++) {
    for (const e of ENTRIES) {
      const kind = e.kind || 'day';
      const date = iso(year, e.rule.m, dayOf(e.rule, year));
      const until = kind === 'month' ? iso(year, e.rule.m, daysIn(year, e.rule.m)) : e.days ? addDays(date, e.days - 1) : undefined;
      if ((until || date) < from || date > to) continue;
      const focus = e.focus || [];
      out.push({ date, ...(until ? { until } : {}), name: e.name, kind, scope: e.scope || 'global', focus, rank: matches(focus) ? 0 : focus.length ? 2 : 1 });
    }
  }
  return out
    .sort((a, b) => a.date.localeCompare(b.date) || a.rank - b.rank)
    .map(({ rank, ...day }) => day);
}

/** Seasonal topics for the months [from, to] touches. */
export function seasonalTopicsBetween(from: string, to: string): SeasonalTopic[] {
  const months = new Set<number>();
  let cursor = `${from.slice(0, 7)}-01`;
  while (cursor <= to && months.size < 12) {
    months.add(Number(cursor.slice(5, 7)));
    const [y, m] = cursor.split('-').map(Number);
    cursor = m === 12 ? iso(y + 1, 1, 1) : iso(y, m + 1, 1);
  }
  return SEASONAL_TOPICS.filter((t) => t.months.some((m) => months.has(m)));
}

/** A valid YYYY-MM-DD, or null. */
export function isoDate(value: unknown): string | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00Z`);
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value ? value : null;
}
