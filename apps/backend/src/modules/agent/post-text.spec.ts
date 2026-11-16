import { assertPublishable, tidyCaption } from './post-text';

describe('post text', () => {
  it('refuses captions that carry working notes', () => {
    expect(() => assertPublishable('[CAROUSEL SLIDES – text for the design, not for posting]\nSlide 1: …')).toThrow(/working note/);
    expect(() => assertPublishable('Winter tips\n\n[CAPTION TO POST]\nStay warm')).toThrow(/\[CAPTION TO POST\]/);
    expect(() => assertPublishable('Call us on [Phone Number]')).toThrow();
    expect(() => assertPublishable('[Scene 1: doctor at the desk]')).toThrow();
  });

  it('lets ordinary captions through', () => {
    expect(() => assertPublishable('Winter in Hyderabad brings cooler mornings. Book via the link in our bio ✅')).not.toThrow();
    expect(() => assertPublishable('सर्दियों में अस्थमा का ध्यान रखें')).not.toThrow();
    expect(() => assertPublishable('')).not.toThrow();
    expect(() => assertPublishable(undefined)).not.toThrow();
  });

  it('turns checklist boxes into bullets and drops stray ones', () => {
    expect(tidyCaption('☐ Inhaler in your bag\n  □ Technique check\nDone ☑ today')).toBe('• Inhaler in your bag\n  • Technique check\nDone  today');
  });

  it('removes replacement characters and keeps emoji and Indian scripts', () => {
    expect(tidyCaption('Care closer � for everyone ✅ 👉')).toBe('Care closer  for everyone ✅ 👉');
    expect(tidyCaption('तेलुगु: శీతాకాలం')).toBe('तेलुगु: శీతాకాలం');
  });
});
