import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaService } from '../../prisma/prisma.service';
import { BusinessService } from '../business/business.service';
import { CredentialsService } from '../credentials/credentials.service';
import { PostImageService } from '../design/post-image.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { AGENT_SYSTEM_PROMPT } from './agent.prompt';

const MODEL = 'claude-opus-5-5';
const MAX_STEPS = 10;

/** Each platform's draft type; publishing dispatches on the connection, credits on this. */
const DRAFT_TYPES: Record<string, string> = {
  instagram: 'INSTAGRAM_IMAGE',
  facebook: 'FACEBOOK_IMAGE',
  blog: 'BLOG_POST',
};

const TOOLS: any[] = [
  {
    name: 'get_business_profile',
    description:
      "Read the provider's profile: name, type, specialities, services, products, city and brand voice. Call this before writing anything.",
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'list_connected_accounts',
    description: 'List the social accounts this provider has connected.',
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'create_post_image',
    description:
      'Make a finished, branded post image and return its public URL. An image model draws the scene with no text; your headline and points are laid over it exactly as written, so put every word, date and offer in those fields, never in the scene. Do not depict real patients or identifiable people.',
    input_schema: {
      type: 'object',
      properties: {
        scene: {
          type: 'string',
          description: 'What the picture shows, with no words in it: objects, setting, light, mood. E.g. "eyeglasses and a contact lens case on a clean desk by a window, soft morning light".',
        },
        headline: { type: 'string', description: 'Main line, a few words. E.g. "FREE Eye Test Camp".' },
        subheading: { type: 'string', description: 'Date, time or short supporting line.' },
        points: {
          type: 'array',
          items: { type: 'string' },
          maxItems: 6,
          description: 'Up to six short lines. Start a line with "50% off" or "FREE" to show it as a badge.',
        },
        footer: { type: 'string', description: 'E.g. a co-host or call to action.' },
        fine_print: { type: 'string', description: 'E.g. "T&C apply".' },
      },
      required: ['scene', 'headline'],
      additionalProperties: false,
    },
  },
  {
    name: 'save_post_draft',
    description:
      'Save a finished post as a draft for the provider to review. Nothing is published. Call once per platform.',
    strict: true,
    input_schema: {
      type: 'object',
      properties: {
        platform: { type: 'string', enum: ['facebook', 'instagram', 'blog'] },
        title: { type: 'string', description: 'Blog title, or a short internal label for a post.' },
        caption: { type: 'string', description: 'The post text. For a blog, a short summary.' },
        body: { type: 'string', description: 'Full article text for a blog; empty for social posts.' },
        hashtags: { type: 'array', items: { type: 'string' } },
        mediaUrls: { type: 'array', items: { type: 'string' } },
      },
      required: ['platform', 'title', 'caption', 'body', 'hashtags', 'mediaUrls'],
      additionalProperties: false,
    },
  },
  // Live trends, diseases and local news. Anthropic runs this server-side.
  {
    type: 'web_search_20260209',
    name: 'web_search',
    max_uses: 5,
    user_location: { type: 'approximate', country: 'IN', timezone: 'Asia/Kolkata' },
  },
];

export interface AgentReply {
  conversationId: string;
  reply: string;
  drafts: Array<Record<string, unknown>>;
}

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(
    private prisma: PrismaService,
    private credentials: CredentialsService,
    private business: BusinessService,
    private postImages: PostImageService,
    private subscriptions: SubscriptionsService,
  ) {}

  private async client(): Promise<Anthropic> {
    const apiKey = await this.credentials.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      throw new ServiceUnavailableException('The marketing assistant is not configured.');
    }
    return new Anthropic({ apiKey });
  }

  async chat(
    userId: string,
    input: { conversationId?: string; message: string; mediaUrls?: string[] },
  ): Promise<AgentReply> {
    const text = (input.message || '').trim();
    if (!text) throw new BadRequestException('Say what you would like to create.');

    const client = await this.client();
    const conversation = await this.openConversation(userId, input.conversationId, text);
    await this.subscriptions.consumeCredits(userId, 'AGENT_MESSAGE', conversation.id);

    const stored = await this.prisma.agentMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
    });
    const messages: Anthropic.MessageParam[] = stored.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: JSON.parse(m.content),
    }));

    const attached = (input.mediaUrls || []).filter((u) => /^https:\/\//.test(u));
    const firstTurn: Anthropic.MessageParam = {
      role: 'user',
      content: [
        {
          type: 'text',
          text: attached.length ? `${text}\n\nAttached media URLs:\n${attached.join('\n')}` : text,
        },
      ],
    };
    await this.remember(conversation.id, firstTurn, messages);

    const drafts: AgentReply['drafts'] = [];
    let reply = '';

    for (let step = 0; step < MAX_STEPS; step++) {
      const response = await this.ask(client, messages);
      const assistant: Anthropic.MessageParam = { role: 'assistant', content: response.content };
      await this.remember(conversation.id, assistant, messages);

      const said = response.content
        .filter((b: any) => b.type === 'text')
        .map((b: any) => b.text)
        .join('\n')
        .trim();
      if (said) reply = said;

      if (response.stop_reason === 'pause_turn') continue; // a long web search: resume it
      if (response.stop_reason === 'refusal') {
        reply = "I can't help with that one. Try asking for a general health-education post.";
        break;
      }
      if (response.stop_reason !== 'tool_use') break;

      const calls = response.content.filter(
        (b: any): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
      );
      const results: Anthropic.ToolResultBlockParam[] = [];
      for (const call of calls) {
        try {
          const output = await this.runTool(userId, call, drafts);
          results.push({ type: 'tool_result', tool_use_id: call.id, content: JSON.stringify(output) });
        } catch (error) {
          results.push({
            type: 'tool_result',
            tool_use_id: call.id,
            is_error: true,
            content: (error as Error).message,
          });
        }
      }
      await this.remember(conversation.id, { role: 'user', content: results }, messages);
    }

    await this.prisma.agentConversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });
    return { conversationId: conversation.id, reply, drafts };
  }

  private async ask(client: Anthropic, messages: Anthropic.MessageParam[]) {
    // `output_config`, `fallbacks` and the dated web search type are newer than this SDK's
    // types; it passes them through to the API unchanged.
    return client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      output_config: { effort: 'medium' },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: [
        { type: 'text', text: AGENT_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
      ],
      tools: TOOLS,
      messages,
    } as any) as unknown as Promise<Anthropic.Message>;
  }

  private async runTool(
    userId: string,
    call: Anthropic.ToolUseBlock,
    drafts: AgentReply['drafts'],
  ): Promise<unknown> {
    const input = call.input as Record<string, any>;
    switch (call.name) {
      case 'get_business_profile':
        return this.business.getBusinessProfile(userId);

      case 'list_connected_accounts':
        return this.prisma.platformConnection.findMany({
          where: { userId, status: 'CONNECTED' },
          select: { id: true, platform: true, accountName: true },
        });

      case 'create_post_image': {
        return this.postImages.compose(userId, {
          scene: input.scene,
          headline: input.headline,
          subheading: input.subheading,
          points: input.points,
          footer: input.footer,
          finePrint: input.fine_print,
        });
      }

      case 'save_post_draft': {
        const type = DRAFT_TYPES[input.platform];
        if (!type) throw new Error(`Unknown platform: ${input.platform}`);
        if (input.platform === 'instagram' && !(input.mediaUrls || []).length) {
          throw new Error('Instagram posts need an image. Attach one or call create_post_image first.');
        }
        const draft = await this.prisma.content.create({
          data: {
            userId,
            type,
            status: 'DRAFT',
            title: input.title,
            caption: input.caption,
            body: input.body || null,
            hashtags: JSON.stringify(input.hashtags || []),
            mediaUrls: JSON.stringify(input.mediaUrls || []),
            aiMetadata: JSON.stringify({ source: 'marketing-assistant', platform: input.platform }),
          },
        });
        const summary = {
          id: draft.id,
          platform: input.platform,
          title: input.title,
          caption: input.caption,
          body: input.body || '',
          hashtags: input.hashtags || [],
          mediaUrls: input.mediaUrls || [],
        };
        drafts.push(summary);
        return { saved: true, draftId: draft.id, note: 'Saved as a draft. The provider must publish it.' };
      }

      default:
        throw new Error(`Unknown tool: ${call.name}`);
    }
  }

  private async openConversation(userId: string, id: string | undefined, firstMessage: string) {
    if (id) {
      const found = await this.prisma.agentConversation.findFirst({ where: { id, userId } });
      if (!found) throw new NotFoundException('Conversation not found');
      return found;
    }
    return this.prisma.agentConversation.create({
      data: { userId, title: firstMessage.slice(0, 80) },
    });
  }

  /** Append-only: earlier turns must go back to the API exactly as they were. */
  private async remember(
    conversationId: string,
    message: Anthropic.MessageParam,
    messages: Anthropic.MessageParam[],
  ) {
    messages.push(message);
    await this.prisma.agentMessage.create({
      data: { conversationId, role: message.role, content: JSON.stringify(message.content) },
    });
  }

  async listConversations(userId: string) {
    return this.prisma.agentConversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: 30,
      select: { id: true, title: true, updatedAt: true },
    });
  }

  /** Just what a person said and read: tool calls, results and reasoning are left out. */
  async getConversation(userId: string, id: string) {
    const conversation = await this.prisma.agentConversation.findFirst({
      where: { id, userId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');

    const messages = conversation.messages
      .map((m) => ({
        role: m.role,
        text: (JSON.parse(m.content) as any[])
          .filter((b) => b.type === 'text')
          .map((b) => b.text)
          .join('\n')
          .trim(),
      }))
      .filter((m) => m.text);
    return { id: conversation.id, title: conversation.title, messages };
  }
}
