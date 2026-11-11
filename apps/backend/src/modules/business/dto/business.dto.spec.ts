import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { UpdateBusinessProfileDto } from './business.dto';

// The same options as the app's global ValidationPipe (main.ts).
const errorsFor = (body: Record<string, unknown>) =>
  validateSync(plainToInstance(UpdateBusinessProfileDto, body), { whitelist: true, forbidNonWhitelisted: true });

describe('UpdateBusinessProfileDto.logoUrl', () => {
  it('accepts a public https link', () => {
    expect(errorsFor({ logoUrl: 'https://static-assets.quickcare.life/brand-kit/60619/logo.png' })).toHaveLength(0);
  });

  it('accepts null, which clears the logo', () => {
    expect(errorsFor({ logoUrl: null })).toHaveLength(0);
  });

  it.each(['http://example.com/logo.png', 'javascript:alert(1)', 'not a url', `https://example.com/${'a'.repeat(500)}.png`])(
    'rejects %s',
    (logoUrl) => {
      expect(errorsFor({ logoUrl }).map((e) => e.property)).toEqual(['logoUrl']);
    },
  );

  it('still rejects fields the DTO does not declare', () => {
    expect(errorsFor({ logo: 'https://example.com/logo.png' }).map((e) => e.property)).toEqual(['logo']);
  });
});
