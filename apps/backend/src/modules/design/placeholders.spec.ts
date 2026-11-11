import { stripPlaceholders } from './placeholders';

describe('stripPlaceholders', () => {
  it('drops placeholders and the separators and labels left behind', () => {
    const { copy, removed } = stripPlaceholders({
      headline: 'FREE FIRST OPINION VIDEO CONSULTATION',
      cta: 'BOOK YOUR FREE SLOT',
      footerLines: [
        'Docty Clinics, Hyderabad | [Phone Number]',
        'Follow us: Instagram [Handle] | Facebook [Page Link]',
        '[Website]',
        'Call: 98980 48888',
      ],
    });
    expect(copy.footerLines).toEqual(['Docty Clinics, Hyderabad', 'Call: 98980 48888']);
    expect(copy.headline).toBe('FREE FIRST OPINION VIDEO CONSULTATION');
    expect(removed).toEqual(['[Phone Number]', '[Handle]', '[Page Link]', '[Website]']);
  });

  it('leaves real text alone, including prices and brackets with no placeholder', () => {
    const input = { headline: 'Full Body Checkup ₹599', footerLines: ['Call: 98980 48888 · www.docty.in'], items: [{ label: 'BP', detail: 'Blood pressure' }] };
    const { copy, removed } = stripPlaceholders(input);
    expect(copy).toEqual({ ...input, subheading: undefined, price: undefined, priceNote: undefined, itemsNote: undefined, cta: undefined, footer: undefined, finePrint: undefined, points: undefined });
    expect(removed).toEqual([]);
  });

  it('handles curly and angle-bracket placeholders, and drops an emptied line', () => {
    const { copy } = stripPlaceholders({ headline: 'Eye camp', footerLines: ['Call: {phone}', 'Visit <website>'], cta: 'Book now' });
    expect(copy.footerLines).toEqual([]);
  });
});
