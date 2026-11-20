import { PublishingService } from './publishing.service';

describe('PublishingService.publishNow', () => {
  it('refuses an older draft whose caption still holds working notes, before charging or posting', async () => {
    const content = {
      id: 'c1',
      userId: 'u1',
      status: 'DRAFT',
      type: 'INSTAGRAM_REEL',
      caption: '[REEL SCRIPT – for filming, not for posting. About 20 seconds.]\nScene 1 (0–3s) – Hook',
      connection: { id: 'k1', userId: 'u1', platform: 'INSTAGRAM' },
    };
    const update = jest.fn();
    const consumeCredits = jest.fn();
    const service = new PublishingService(
      { content: { findUnique: jest.fn(async () => content), update } } as any,
      { consumeCredits } as any,
    );
    await expect(service.publishNow('u1', 'c1')).rejects.toThrow(/notes that are not meant for posting/);
    expect(consumeCredits).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });
});
