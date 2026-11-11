import { composeArtPrompt, pickTheme, THEME_IDS, THEMES } from './post-themes';

describe('themes', () => {
  it('every theme yields a complete colour set from any brand colour', () => {
    for (const id of THEME_IDS) {
      for (const brand of ['#0f766e', '#d6336c', '#1e3a8a', 'not-a-colour']) {
        const c = THEMES[id].colours(brand);
        for (const [key, value] of Object.entries(c)) expect(value).toBeTruthy();
        expect(c.background.length).toBeGreaterThan(10);
      }
      expect(THEMES[id].type.display).toBeTruthy();
    }
  });

  it('picks a theme from what the post is for', () => {
    expect(pickTheme({ text: 'Happy Diwali from all of us' })).toBe('festive');
    expect(pickTheme({ objective: 'greeting' })).toBe('festive');
    expect(pickTheme({ occasion: 'Eid' })).toBe('festive');
    expect(pickTheme({ text: 'Child vaccination drive' })).toBe('playful-kids');
    expect(pickTheme({ text: 'Executive health package' })).toBe('premium-editorial');
    expect(pickTheme({ text: '30% off frames', hasPrice: true })).toBe('bold-promo');
    expect(pickTheme({ objective: 'promotion', hasPrice: true })).toBe('bold-promo');
    expect(pickTheme({ text: 'Free eye test camp' })).toBe('warm-community');
    expect(pickTheme({ text: 'Full body health checkup' })).toBe('clinical-clean');
  });

  it('always honours a theme the assistant names', () => {
    expect(pickTheme({ theme: 'premium-editorial', text: 'Happy Diwali' })).toBe('premium-editorial');
    expect(pickTheme({ theme: 'nonsense', text: 'x' })).toBe('clinical-clean');
  });
});

describe('composeArtPrompt', () => {
  it('builds the picture prompt from the brief, filling gaps from the theme', () => {
    const prompt = composeArtPrompt(
      { subject: 'A Friendly Indian Doctor In A White Coat', setting: 'Bright Clinic', props: ['Stethoscope'], framing: 'close-up', audience: 'Working Adults' },
      THEMES['clinical-clean'],
    );
    expect(prompt).toContain('a friendly indian doctor in a white coat, in bright clinic, with stethoscope.');
    expect(prompt).toContain('Framing: a close, head-and-shoulders framing.');
    expect(prompt).toContain(`Lighting: ${THEMES['clinical-clean'].image.lighting}.`);
    expect(prompt).toContain('Made for: working adults.');
    expect(prompt).toContain('south asian appearance');
    expect(prompt).toContain('Avoid: needles in skin');
    // No pair of capitalised words survives, so the downstream name filter has nothing to misfire on.
    expect(prompt.replace(/(Framing|Lighting|Mood|Colour palette|Made for|Set in|Avoid|Occasion):/g, '')).not.toMatch(/\b[A-Z][a-z]{2,}\s+[A-Z][a-z]{2,}\b/);
  });

  it('prefers the brief over theme defaults', () => {
    const prompt = composeArtPrompt({ subject: 'x', lighting: 'Candlelight', palette: 'Gold And Red', mood: 'Calm', tone: 'warm' }, THEMES.festive);
    expect(prompt).toContain('Lighting: candlelight.');
    expect(prompt).toContain('Colour palette: gold and red.');
    expect(prompt).toContain('Mood: calm, warm.');
  });
});
