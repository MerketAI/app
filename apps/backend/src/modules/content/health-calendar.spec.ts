import { dayOf, healthDaysBetween, isoDate, seasonalTopicsBetween } from './health-calendar';
import { istDate, plannedInstant } from './content-calendar.service';

describe('health calendar', () => {
  it('computes days that move each year', () => {
    // World Sight Day: second Thursday of October.
    expect(dayOf({ m: 10, nth: 2, weekday: 4 }, 2026)).toBe(8);
    expect(dayOf({ m: 10, nth: 2, weekday: 4 }, 2027)).toBe(14);
    // World Kidney Day: second Thursday of March 2027 is 11 March.
    expect(dayOf({ m: 3, nth: 2, weekday: 4 }, 2027)).toBe(11);
    // World Asthma Day: first Tuesday of May 2027 is 4 May.
    expect(dayOf({ m: 5, nth: 1, weekday: 2 }, 2027)).toBe(4);
  });

  it('lists the days in a range, including months and weeks that overlap it', () => {
    const days = healthDaysBetween('2026-11-10', '2026-11-20');
    const names = days.map((d) => d.name);
    expect(names).toEqual(expect.arrayContaining(['World Diabetes Day', "Children's Day", 'World Pneumonia Day', 'Diabetes Awareness Month', 'World AMR Awareness Week']));
    expect(days.find((d) => d.name === 'World Diabetes Day')!.date).toBe('2026-11-14');
    expect(days.find((d) => d.name === 'World AMR Awareness Week')!.until).toBe('2026-11-24');
    expect(names).not.toContain('World AIDS Day');
  });

  it("puts the provider's own days first on a shared date", () => {
    const onTheDay = (specialities: string[]) => healthDaysBetween('2026-11-14', '2026-11-14', specialities).filter((d) => d.kind === 'day');
    expect(onTheDay(['Ophthalmologist'])[0].name).toBe('World Diabetes Day');
    expect(onTheDay(['Pediatrician'])[0].name).toBe("Children's Day");
  });

  it('spans a new year', () => {
    const names = healthDaysBetween('2026-12-30', '2027-01-05').map((d) => d.name);
    expect(names).toContain('World Braille Day');
  });

  it('gives seasonal topics for the months touched', () => {
    const topics = seasonalTopicsBetween('2026-11-01', '2026-11-30').map((t) => t.topic);
    expect(topics).toContain('Air pollution and breathing');
    expect(topics).not.toContain('Monsoon illnesses');
  });

  it('keeps a planned day the same day in India', () => {
    expect(istDate(plannedInstant('2026-11-14'))).toBe('2026-11-14');
    expect(isoDate('2026-02-30')).toBeNull();
    expect(isoDate('2026-11-14')).toBe('2026-11-14');
  });
});
