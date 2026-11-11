import { isAllowedReturnUrl, signOAuthState, verifyOAuthState } from './oauth-state.util';
import { decryptToken, decryptTokenFields, encryptToken, encryptTokenFields } from './token-cipher.util';

describe('OAuth state', () => {
  const secret = 'test-secret';

  it('round-trips a signed state', () => {
    const state = signOAuthState({ userId: 'u1', returnUrl: 'https://a.test/x' }, secret);
    expect(verifyOAuthState(state, secret)).toMatchObject({ userId: 'u1', returnUrl: 'https://a.test/x' });
  });

  it('rejects the old unsigned format', () => {
    const forged = Buffer.from(JSON.stringify({ userId: 'victim' })).toString('base64');
    expect(verifyOAuthState(forged, secret)).toBeNull();
  });

  it('rejects a tampered payload', () => {
    const [, mac] = signOAuthState({ userId: 'attacker' }, secret).split('.');
    const body = Buffer.from(JSON.stringify({ userId: 'victim', exp: Date.now() + 60000 })).toString('base64url');
    expect(verifyOAuthState(`${body}.${mac}`, secret)).toBeNull();
  });

  it('rejects a state signed with another secret', () => {
    expect(verifyOAuthState(signOAuthState({ userId: 'u1' }, 'other'), secret)).toBeNull();
  });

  it('rejects an expired state', () => {
    jest.useFakeTimers().setSystemTime(Date.now());
    const state = signOAuthState({ userId: 'u1' }, secret);
    jest.advanceTimersByTime(16 * 60 * 1000);
    expect(verifyOAuthState(state, secret)).toBeNull();
    jest.useRealTimers();
  });

  it('only honours allowlisted return origins', () => {
    const allowed = 'https://www.quickcare.life, https://staging.quickcare.life/';
    expect(isAllowedReturnUrl('https://www.quickcare.life/clinic/x', allowed)).toBe(true);
    expect(isAllowedReturnUrl('https://staging.quickcare.life/y', allowed)).toBe(true);
    expect(isAllowedReturnUrl('https://evil.example/www.quickcare.life', allowed)).toBe(false);
    expect(isAllowedReturnUrl('https://www.quickcare.life.evil.example/', allowed)).toBe(false);
    expect(isAllowedReturnUrl('javascript:alert(1)', allowed)).toBe(false);
    expect(isAllowedReturnUrl(undefined, allowed)).toBe(false);
  });
});

describe('Token encryption', () => {
  const secret = 'test-key';

  it('round-trips and never stores the plain token', () => {
    const stored = encryptToken('EAAtoken', secret);
    expect(stored).not.toContain('EAAtoken');
    expect(decryptToken(stored, secret)).toBe('EAAtoken');
  });

  it('does not double-encrypt, and reads rows written before encryption', () => {
    const stored = encryptToken('t', secret);
    expect(encryptToken(stored, secret)).toBe(stored);
    expect(decryptToken('legacy-plain', secret)).toBe('legacy-plain');
  });

  it('fails rather than returning garbage under the wrong key', () => {
    expect(() => decryptToken(encryptToken('t', secret), 'wrong')).toThrow();
  });

  it('encrypts write payloads and decrypts nested results', () => {
    const data = { accessToken: 'a', refreshToken: 'r', platform: 'FACEBOOK' };
    encryptTokenFields(data, secret);
    expect(data.accessToken.startsWith('enc:v1:')).toBe(true);
    expect(data.platform).toBe('FACEBOOK');

    const content = { id: 'c1', when: new Date(0), connection: { ...data } };
    decryptTokenFields(content, secret);
    expect(content.connection.accessToken).toBe('a');
    expect(content.when).toEqual(new Date(0));
  });
});
