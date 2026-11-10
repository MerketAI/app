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
  const service = new AgentService(prisma, credentials, business, design, subscriptions);
  return { service, prisma, business, subscriptions, credentials, stored };
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

  it('keeps every block of each turn verbatim for the next request', async () => {
    const { service, stored } = build();
    const thinking = { type: 'thinking', thinking: '', signature: 'sig' };
    create.mockResolvedValueOnce(turn('end_turn', thinking, text('Hi')));
    await service.chat('u1', { message: 'hello' });
    expect(JSON.parse(stored[1].content)).toEqual([thinking, text('Hi')]);
  });
});
