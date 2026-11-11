import { isActiveContent } from './upload.service';

describe('isActiveContent', () => {
  it('flags types a browser would execute when opened directly', () => {
    for (const type of ['text/html', 'text/html; charset=utf-8', 'image/svg+xml', 'application/xhtml+xml',
      'application/javascript', 'text/javascript', 'application/x-javascript', 'text/xml']) {
      expect(isActiveContent(type)).toBe(true);
    }
  });

  it('leaves passive media alone', () => {
    for (const type of ['image/png', 'image/jpeg', 'image/gif', 'video/mp4', 'application/json', 'text/plain', 'application/pdf', '']) {
      expect(isActiveContent(type)).toBe(false);
    }
  });
});
