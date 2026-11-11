const create = jest.fn();
jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({ beta: { messages: { create } } })),
}));

import { AgentService } from './agent.service';

const text = (t: string) => ({ type: 'text', text: t });
const toolUse = (id: string, name: string, input: unknown = {}) => ({ type: 'tool_use', id, name, input });
const turn = (stop_reason: string, ...content: unknown[]) => ({ stop_reason, content });

function build() {
  const stored: any[] = [];
  const prisma: any = {
    agentConversation: {
      create: jest.fn().mockResolvedValue({ id: 'conv1' }),
      findFirst: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({}),
    },
    agentMessage: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation(({ data }) => { stored.push(data); return data; }),
    },
    content: { create: jest.fn().mockResolvedValue({ id: 'draft1' }) },
    platformConnection: { findMany: jest.fn().mockResolvedValue([]) },
  };
  const credentials: any = { get: jest.fn().mockResolvedValue('key') };
  const business: any = { getBusinessProfile: jest.fn().mockResolvedValue({ businessName: 'Satya Clinic' }) };
  const design: any = {
    compose: jest.fn().mockResolvedValue({ url: 'https://cdn.test/d1.png', provider: 'magnific' }),
  };
  const subscriptions: any = { consumeCredits: jest.fn().mockResolvedValue({}) };
  const library: any = {
    recordQuietly: jest.fn().mockResolvedValue({ id: 'lib1' }),
    search: jest.fn().mockResolvedValue({ items: [{ id: 'art1', title: 'Eye camp picture' }], nextCursor: null }),
    update: jest.fn().mockResolvedValue({ id: 'art1' }),
    markUsed: jest.fn().mockResolvedValue(undefined),
  };
  const service = new AgentService(prisma, credentials, business, design, subscriptions, library);
  return { service, prisma, business, subscriptions, credentials, stored, library, design };
}

const post = {
  platform: 'facebook', title: 'Dengue', caption: 'Stay safe', body: '', hashtags: ['#Health'], mediaUrls: [],
};

describe('AgentService', () => {
  beforeEach(() => create.mockReset());

  it('reads the profile, saves a draft and returns it, without publishing', async () => {
    const { service, prisma, business, subscriptions } = build();
    create
      .mockResolvedValueOnce(turn('tool_use', toolUse('t1', 'get_business_profile')))
      .mockResolvedValueOnce(turn('tool_use', toolUse('t2', 'save_post_draft', post)))
      .mockResolvedValueOnce(turn('end_turn', text('Your draft is ready to review.')));

    const result = await service.chat('u1', { message: 'Create my social post' });

    expect(business.getBusinessProfile).toHaveBeenCalledWith('u1');
    expect(prisma.content.create.mock.calls[0][0].data).toMatchObject({ userId: 'u1', status: 'DRAFT', type: 'FACEBOOK_IMAGE' });
    expect(result).toMatchObject({ conversationId: 'conv1', reply: 'Your draft is ready to review.' });
    expect(result.drafts).toHaveLength(1);
    expect(subscriptions.consumeCredits).toHaveBeenCalledWith('u1', 'AGENT_MESSAGE', 'conv1');
  });

  it('offers the model no way to publish', async () => {
    const { service } = build();
    create.mockResolvedValueOnce(turn('end_turn', text('Hello')));
    await service.chat('u1', { message: 'hi' });
    const names = create.mock.calls[0][0].tools.map((t: any) => t.name);
    expect(names).toEqual(expect.arrayContaining(['save_post_draft', 'web_search']));
    expect(names.filter((n: string) => /publish|schedule|post_now/.test(n))).toEqual([]);
  });

  it('reports a tool failure to the model instead of crashing', async () => {
    const { service, prisma } = build();
    create
      .mockResolvedValueOnce(turn('tool_use', toolUse('t1', 'save_post_draft', { ...post, platform: 'instagram' })))
      .mockResolvedValueOnce(turn('end_turn', text('I need an image first.')));

    await service.chat('u1', { message: 'Instagram post' });

    expect(prisma.content.create).not.toHaveBeenCalled();
    const blocks = create.mock.calls[1][0].messages.flatMap((m: any) => m.content);
    expect(blocks.find((b: any) => b.type === 'tool_result')).toMatchObject({ is_error: true });
  });

  it('resumes after pause_turn, and stops cleanly on a refusal', async () => {
    const { service } = build();
    create
      .mockResolvedValueOnce(turn('pause_turn', text('Searching')))
      .mockResolvedValueOnce(turn('refusal'));
    const result = await service.chat('u1', { message: 'x' });
    expect(create).toHaveBeenCalledTimes(2);
    expect(result.reply).toContain("can't help");
  });

  it("cannot open another user's conversation", async () => {
    const { service } = build();
    await expect(service.chat('u1', { conversationId: 'theirs', message: 'hi' })).rejects.toThrow('Conversation not found');
    expect(create).not.toHaveBeenCalled();
  });

  it('stops at the step limit rather than looping forever', async () => {
    const { service } = build();
    create.mockResolvedValue(turn('tool_use', toolUse('t', 'list_connected_accounts')));
    await service.chat('u1', { message: 'x' });
    expect(create).toHaveBeenCalledTimes(10);
  });

  describe('the asset library', () => {
    it('searches the library and reuses a picture by id, filing the new post', async () => {
      const { service, library, design } = build();
      create
        .mockResolvedValueOnce(turn('tool_use', toolUse('t1', 'search_library', { query: 'eye camp' })))
        .mockResolvedValueOnce(turn('tool_use', toolUse('t2', 'create_post_image', {
          artwork_id: 'art1', headline: 'FREE Eye Test Camp', folder: 'campaigns/eye-camp', tags: ['eye-care'], notes: 'Nov camp',
        })))
        .mockResolvedValueOnce(turn('end_turn', text('Done.')));
      await service.chat('u1', { message: 'Another post for the camp' });
      expect(library.search).toHaveBeenCalledWith('u1', expect.objectContaining({ query: 'eye camp' }));
      expect(design.compose).toHaveBeenCalledWith('u1', expect.objectContaining({
        artworkId: 'art1', folder: 'campaigns/eye-camp', tags: ['eye-care'], notes: 'Nov camp',
      }));
    });

    it('files what the provider attaches and counts images used in a draft', async () => {
      const { service, library } = build();
      create
        .mockResolvedValueOnce(turn('tool_use', toolUse('t1', 'save_post_draft', { ...post, mediaUrls: ['https://cdn.test/a.png'] })))
        .mockResolvedValueOnce(turn('end_turn', text('Saved.')));
      await service.chat('u1', { message: 'Use my photo', mediaUrls: ['https://qc.test/photo.jpg'] });
      expect(library.recordQuietly).toHaveBeenCalledWith('u1', expect.objectContaining({
        kind: 'upload', folder: 'uploads/attached', storageKey: 'external:https://qc.test/photo.jpg', mimeType: 'image/jpeg',
      }));
      expect(library.markUsed).toHaveBeenCalledWith('u1', ['https://cdn.test/a.png']);
      // The attached photo is shown to the model as an image, not only linked.
      const firstTurn = create.mock.calls[0][0].messages[0];
      expect(firstTurn.content[0]).toEqual({ type: 'image', source: { type: 'url', url: 'https://qc.test/photo.jpg' } });
      expect(firstTurn.content[1].text).toContain('1. https://qc.test/photo.jpg');
    });
  });

  describe('revising a draft', () => {
    const existing = {
      id: 'draft1', userId: 'u1', status: 'DRAFT', title: 'Camp', caption: 'Old', body: null,
      hashtags: '["#Eyes"]', mediaUrls: '["https://cdn.test/old.png"]',
      aiMetadata: JSON.stringify({ source: 'marketing-assistant', platform: 'instagram' }),
    };
    const revise = async (row: any, input: any) => {
      const built = build();
      built.prisma.content.findFirst = jest.fn().mockResolvedValue(row);
      built.prisma.content.update = jest.fn().mockImplementation(({ data }) => ({ ...row, ...data }));
      create
        .mockResolvedValueOnce(turn('tool_use', toolUse('t1', 'update_post_draft', input)))
        .mockResolvedValueOnce(turn('end_turn', text('Changed it.')));
      const result = await built.service.chat('u1', { message: 'make it 40%' });
      const toolResult = create.mock.calls[1][0].messages.flatMap((m: any) => m.content).find((b: any) => b.type === 'tool_result');
      return { ...built, result, toolResult };
    };

    it('changes only the fields given and returns the revised draft', async () => {
      const { prisma, result } = await revise(existing, { draftId: 'draft1', caption: 'New', mediaUrls: ['https://cdn.test/new.png'] });
      expect(prisma.content.findFirst).toHaveBeenCalledWith({ where: { id: 'draft1', userId: 'u1' } });
      expect(prisma.content.update.mock.calls[0][0].data).toEqual({ caption: 'New', mediaUrls: '["https://cdn.test/new.png"]' });
      expect(result.drafts[0]).toMatchObject({ id: 'draft1', platform: 'instagram', caption: 'New', revised: true, hashtags: ['#Eyes'] });
    });

    it("cannot touch another provider's draft", async () => {
      const { prisma, toolResult } = await revise(null, { draftId: 'theirs', caption: 'x' });
      expect(prisma.content.update).not.toHaveBeenCalled();
      expect(toolResult).toMatchObject({ is_error: true });
    });

    it('refuses to change a scheduled or published post', async () => {
      const { prisma, toolResult } = await revise({ ...existing, status: 'PUBLISHED' }, { draftId: 'draft1', caption: 'x' });
      expect(prisma.content.update).not.toHaveBeenCalled();
      expect(JSON.stringify(toolResult)).toContain('no longer a draft');
    });

    it('refuses an update that changes nothing, pointing at get_draft', async () => {
      const { prisma, toolResult } = await revise(existing, { draftId: 'draft1' });
      expect(prisma.content.update).not.toHaveBeenCalled();
      expect(JSON.stringify(toolResult)).toContain('get_draft');
    });

    it('reads a draft in full without changing it', async () => {
      const built = build();
      built.prisma.content.findFirst = jest.fn().mockResolvedValue(existing);
      built.prisma.content.update = jest.fn();
      create
        .mockResolvedValueOnce(turn('tool_use', toolUse('t1', 'get_draft', { draftId: 'draft1' })))
        .mockResolvedValueOnce(turn('end_turn', text('Read it.')));
      await built.service.chat('u1', { message: 'what did the last post say?' });
      const toolResult = create.mock.calls[1][0].messages.flatMap((m: any) => m.content).find((b: any) => b.type === 'tool_result');
      expect(JSON.stringify(toolResult)).toContain('Old');
      expect(built.prisma.content.update).not.toHaveBeenCalled();
    });

    it('will not leave an Instagram draft without an image', async () => {
      const { prisma } = await revise(existing, { draftId: 'draft1', mediaUrls: [] });
      expect(prisma.content.update).not.toHaveBeenCalled();
    });
  });

  it('keeps every block of each turn verbatim for the next request', async () => {
    const { service, stored } = build();
    const thinking = { type: 'thinking', thinking: '', signature: 'sig' };
    create.mockResolvedValueOnce(turn('end_turn', thinking, text('Hi')));
    await service.chat('u1', { message: 'hello' });
    expect(JSON.parse(stored[1].content)).toEqual([thinking, text('Hi')]);
  });
});

describe('conversationView', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { conversationView } = require('./agent.service');
  const msg = (role: string, ...blocks: unknown[]) => ({ role, content: JSON.stringify(blocks) });
  const result = (id: string, out: unknown, is_error = false) => ({ type: 'tool_result', tool_use_id: id, content: JSON.stringify(out), is_error });

  it('gives each turn’s drafts to its last reply, and hides tool traffic', () => {
    const view = conversationView([
      msg('user', text('Make an eye camp post')),
      msg('assistant', text('Designing it now.'), toolUse('t1', 'create_post_image')),
      msg('user', result('t1', { url: 'x' })),
      msg('assistant', toolUse('t2', 'save_post_draft')),
      msg('user', result('t2', { saved: true, draftId: 'd1' })),
      msg('assistant', text('Here is your post.')),
      msg('user', text('Make it shorter')),
      msg('assistant', toolUse('t3', 'update_post_draft')),
      msg('user', result('t3', { updated: true, draftId: 'd1' })),
      msg('assistant', text('Shortened.')),
    ]);
    expect(view.map((m: any) => [m.role, m.text, m.draftIds])).toEqual([
      ['user', 'Make an eye camp post', []],
      ['assistant', 'Designing it now.', []],
      ['assistant', 'Here is your post.', ['d1']],
      ['user', 'Make it shorter', []],
      ['assistant', 'Shortened.', ['d1']],
    ]);
  });

  it('ignores failed draft calls and other tools', () => {
    const view = conversationView([
      msg('user', text('Post please')),
      msg('assistant', toolUse('t1', 'save_post_draft'), toolUse('t2', 'get_draft')),
      msg('user', { type: 'tool_result', tool_use_id: 't1', is_error: true, content: 'Instagram posts need an image.' }, result('t2', { draftId: 'old' })),
      msg('assistant', text('I need an image first.')),
    ]);
    expect(view[1].draftIds).toEqual([]);
  });
});
