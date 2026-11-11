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
import { CREATIVE_SPECS, SPEC_IDS } from '../design/creative-specs';
import { THEME_IDS, THEMES } from '../design/post-themes';
import { LIBRARY_ROOTS, LibraryService } from '../library/library.service';
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

/** One line per theme for the model. Static, so it caches. */
const THEME_GUIDE = THEME_IDS.map((id) => `${id}: ${THEMES[id].description} Use for: ${THEMES[id].useFor}`).join(' | ');

/** One line per placement for the model: "instagram-story 1080x1920 9:16". Static, so it caches. */
const SPEC_GUIDE = CREATIVE_SPECS.map((s) => `${s.id} ${s.width}x${s.height} ${s.ratio}`).join('; ');

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
      'Make a finished, branded post image and return its public URL. An image model draws the scene with no text; every word is laid over it exactly as written, so put all text in the copy fields, never in the scene. Map the brief onto the fields: a price or offer figure goes in price (shown largest), tests/services/features in items (cards with icons), a call to action in cta (a button), contact lines in footer_lines. Do not depict real patients or identifiable people.',
    input_schema: {
      type: 'object',
      properties: {
        theme: {
          type: 'string',
          enum: THEME_IDS,
          description: `The visual theme (fonts, colours, layout styling and picture style). Pick the one that fits the brief, or the one the provider names; keep it the same across a campaign. ${THEME_GUIDE}`,
        },
        art_direction: {
          type: 'object',
          description: 'The brief for the picture (no words appear in it). Fill what the provider gave you and decide the rest to suit the theme; anything left out uses the theme default.',
          properties: {
            objective: { type: 'string', enum: ['promotion', 'event', 'awareness', 'education', 'greeting', 'announcement', 'hiring'] },
            audience: { type: 'string', description: 'e.g. "working adults 30-55", "parents of young children".' },
            tone: { type: 'string', description: 'e.g. "reassuring", "celebratory".' },
            style: { type: 'string', enum: ['photographic', 'illustration', 'flat-vector', '3d'], description: 'Overrides the theme picture style.' },
            subject: { type: 'string', description: 'Who or what the picture shows: a role, never a named person. e.g. "a friendly indian woman doctor in a white coat".' },
            setting: { type: 'string', description: 'e.g. "a bright modern clinic", "a decorated home courtyard at dusk".' },
            props: { type: 'array', items: { type: 'string' }, maxItems: 6, description: 'e.g. ["stethoscope", "clipboard"], ["diyas", "rangoli"].' },
            lighting: { type: 'string' },
            framing: { type: 'string', enum: ['waist-up', 'close-up', 'full-body', 'object', 'scene'] },
            palette: { type: 'string', description: 'Colours for the picture, e.g. "white, soft teal and pale blue".' },
            mood: { type: 'string' },
            occasion: { type: 'string', description: 'Festival or day, e.g. "Diwali", "World Diabetes Day".' },
          },
          required: ['subject'],
          additionalProperties: false,
        },
        scene: {
          type: 'string',
          description: 'Short alternative to art_direction: what the picture shows, with no words in it.',
        },
        spec: {
          type: 'string',
          enum: SPEC_IDS,
          description: `Where the creative will be used; this sets its exact size and ratio. ${SPEC_GUIDE}`,
        },
        specs: {
          type: 'array',
          items: { type: 'string', enum: SPEC_IDS },
          maxItems: 6,
          description: 'Several placements at once (e.g. a feed post and a story), all from one picture at no extra image cost. Use instead of spec.',
        },
        platform: {
          type: 'string',
          description: 'If no spec fits, the platform name gives its default feed size.',
        },
        width: { type: 'integer', description: 'Only for an exact size the provider gives that no spec matches (200-4000 px).' },
        height: { type: 'integer', description: 'With width.' },
        headline: { type: 'string', description: 'Main line. Use \\n for a line break, e.g. "FULL BODY\\nHEALTH CHECKUP".' },
        subheading: { type: 'string', description: 'Date, time or short supporting line.' },
        price: { type: 'string', description: 'The hero figure, shown largest: "₹599", "50% OFF", "FREE".' },
        price_note: { type: 'string', description: 'One line under the price.' },
        items: {
          type: 'array',
          maxItems: 8,
          description: 'Cards with icons, e.g. tests in a package or services.',
          items: {
            type: 'object',
            properties: {
              label: { type: 'string', description: 'Short name, e.g. "LFT".' },
              detail: { type: 'string', description: 'e.g. "Liver Function Test".' },
              icon: {
                type: 'string',
                enum: ['liver', 'kidney', 'heart', 'drop', 'eye', 'glasses', 'tooth', 'flask', 'pill', 'stethoscope', 'lungs', 'brain', 'bone', 'thyroid', 'baby', 'shieldcheck', 'check', 'calendar', 'clock', 'tag'],
                description: 'Optional; picked from the words when omitted.',
              },
            },
            required: ['label'],
            additionalProperties: false,
          },
        },
        items_note: { type: 'string', description: 'Small line under the cards, e.g. "Contact us for the complete test list."' },
        points: {
          type: 'array',
          items: { type: 'string' },
          maxItems: 6,
          description: 'Short lines when cards do not fit the brief. Start a line with "50% off" or "FREE" to show it as a badge.',
        },
        cta: { type: 'string', description: 'Call-to-action button, e.g. "BOOK YOUR CHECKUP TODAY".' },
        footer_lines: {
          type: 'array',
          items: { type: 'string' },
          maxItems: 4,
          description: 'Footer band lines: business name first, then phone and location. Placeholders like "[Phone Number]" are kept as written.',
        },
        logo: { type: 'string', enum: ['show', 'reserve', 'none'], description: '"reserve" keeps empty space for a logo; "show" uses the logo on file.' },
        footer: { type: 'string', description: 'A single footer line, e.g. a co-host.' },
        fine_print: { type: 'string', description: 'E.g. "T&C apply".' },
        mode: {
          type: 'string',
          enum: ['designer', 'layout'],
          description:
            'designer: an image model designs the whole creative like a graphic designer (most creative and polished), then every word is proofread automatically; a size that fails is remade with layout. layout: exact text laid over a picture; fastest, and best for small text changes, revisions and many sizes.',
        },
        logo_url: { type: 'string', description: 'An attached image that is the provider\'s logo, to place exactly as supplied. Otherwise the logo on file is used.' },
        reference_urls: {
          type: 'array',
          items: { type: 'string' },
          maxItems: 3,
          description: 'Attached images to follow for style, colours and layout ideas (designer mode). Never copied.',
        },
        artwork_id: {
          type: 'string',
          description: 'Reuse a picture from search_library instead of drawing a new one (free, and keeps a campaign consistent). Then scene may be omitted.',
        },
        folder: {
          type: 'string',
          description: `Library folder, "<root>/<topic>", e.g. "campaigns/eye-test-camp-nov-2026". Roots: ${LIBRARY_ROOTS.join(', ')}.`,
        },
        title: { type: 'string', description: 'Short name for the library, e.g. "Eye Test Camp - Instagram".' },
        tags: { type: 'array', items: { type: 'string' }, maxItems: 12, description: 'Lowercase topic tags, e.g. ["eye-care","camp","offer","lenskart"].' },
        notes: { type: 'string', description: 'One line on what this is for and what worked, for reuse later.' },
      },
      required: ['headline'],
      additionalProperties: false,
    },
  },
  {
    name: 'search_library',
    description:
      "Search the provider's asset library (images, posts, designs, videos, GIF, SVG, HTML, JSON...) before making something new. Returns short descriptions and URLs, not the files.",
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Words to match in titles, notes, scenes and tags.' },
        folder: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
        kind: { type: 'string', enum: ['artwork', 'post', 'design', 'upload', 'stock', 'cutout', 'icon', 'template', 'component', 'data'] },
        media_type: { type: 'string', enum: ['image', 'gif', 'svg', 'video', 'audio', 'html', 'react', 'json', 'pdf', 'text', 'other'] },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'update_library_asset',
    description: 'Move, rename, retag or add notes to a library asset, e.g. when the provider says what worked.',
    input_schema: {
      type: 'object',
      properties: {
        asset_id: { type: 'string' },
        folder: { type: 'string' },
        title: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
        notes: { type: 'string' },
      },
      required: ['asset_id'],
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
  {
    name: 'list_drafts',
    description: "List the provider's most recent unpublished drafts, newest first, to find one they want changed.",
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'get_draft',
    description: 'Read one draft in full (caption, body, hashtags, images), e.g. to reuse its wording. Read-only.',
    input_schema: {
      type: 'object',
      properties: { draftId: { type: 'string' } },
      required: ['draftId'],
      additionalProperties: false,
    },
  },
  {
    name: 'update_post_draft',
    description:
      'Revise an existing draft. Pass only the fields that change; the rest stay as they are. Only unpublished drafts can be changed.',
    input_schema: {
      type: 'object',
      properties: {
        draftId: { type: 'string' },
        title: { type: 'string' },
        caption: { type: 'string' },
        body: { type: 'string' },
        hashtags: { type: 'array', items: { type: 'string' } },
        mediaUrls: { type: 'array', items: { type: 'string' }, description: 'Replaces the images, e.g. with a new create_post_image URL.' },
      },
      required: ['draftId'],
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

const DRAFT_TOOLS = new Set(['save_post_draft', 'update_post_draft']);

/**
 * The messages a person saw, each assistant reply carrying the ids of the drafts its
 * turn saved or revised. A turn runs from one thing the person typed to the next; its
 * drafts belong to the last reply in it, which is where the cards were shown.
 */
export function conversationView(stored: Array<{ role: string; content: string }>) {
  const out: Array<{ role: string; text: string; draftIds: string[] }> = [];
  const toolNames = new Map<string, string>();
  let pending: string[] = [];
  let lastReply: { draftIds: string[] } | undefined;

  const flush = () => {
    if (lastReply && pending.length) lastReply.draftIds = [...new Set([...lastReply.draftIds, ...pending])];
    pending = [];
  };

  for (const m of stored) {
    let blocks: any[];
    try { blocks = JSON.parse(m.content); } catch { continue; }
    if (!Array.isArray(blocks)) blocks = [{ type: 'text', text: String(blocks) }];

    for (const b of blocks) {
      if (b.type === 'tool_use') toolNames.set(b.id, b.name);
      if (b.type === 'tool_result' && !b.is_error && DRAFT_TOOLS.has(toolNames.get(b.tool_use_id) || '')) {
        try {
          const result = JSON.parse(typeof b.content === 'string' ? b.content : b.content?.[0]?.text || '');
          if (result && result.draftId) pending.push(result.draftId);
        } catch { /* not JSON: no draft */ }
      }
    }

    const text = blocks.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
    if (!text) continue;
    if (m.role === 'user') {
      flush();
      lastReply = undefined;
      out.push({ role: m.role, text, draftIds: [] });
    } else {
      const entry = { role: m.role, text, draftIds: [] as string[] };
      out.push(entry);
      lastReply = entry;
    }
  }
  flush();
  return out;
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
    private library: LibraryService,
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
    // What the provider attaches is filed too, so it can be found and reused later.
    for (const url of attached) {
      const extension = (url.split('?')[0].split('.').pop() || '').toLowerCase().slice(0, 8);
      await this.library.recordQuietly(userId, {
        kind: 'upload',
        folder: 'uploads/attached',
        url,
        storageKey: `external:${url}`,
        extension,
        mimeType: /^(jpe?g|png|webp)$/.test(extension) ? `image/${extension.replace('jpg', 'jpeg')}` : undefined,
        source: 'provider-upload',
      });
    }
    // Attached pictures are shown to the model, not just linked, so it can tell a
    // logo from a reference, read brand colours and pick up details like a phone number.
    const visible = attached.filter((u) => /\.(png|jpe?g|webp|gif)(\?|$)/i.test(u)).slice(0, 4);
    const firstTurn: Anthropic.MessageParam = {
      role: 'user',
      content: [
        ...visible.map((url) => ({ type: 'image' as const, source: { type: 'url' as const, url } })),
        {
          type: 'text',
          text: attached.length
            ? `${text}\n\nAttached media URLs (in the order shown above):\n${attached.map((u, i) => `${i + 1}. ${u}`).join('\n')}`
            : text,
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
          artDirection: input.art_direction,
          theme: input.theme,
          mode: input.mode,
          logoUrl: input.logo_url,
          referenceUrls: input.reference_urls,
          artworkId: input.artwork_id,
          spec: input.spec,
          specs: input.specs,
          platform: input.platform,
          width: input.width,
          height: input.height,
          // Older conversations may still send the four legacy formats.
          format: input.format,
          headline: input.headline,
          subheading: input.subheading,
          price: input.price,
          priceNote: input.price_note,
          items: input.items,
          itemsNote: input.items_note,
          points: input.points,
          cta: input.cta,
          footerLines: input.footer_lines,
          logo: input.logo,
          footer: input.footer,
          finePrint: input.fine_print,
          folder: input.folder,
          title: input.title,
          tags: input.tags,
          notes: input.notes,
        });
      }

      case 'search_library':
        return this.library.search(userId, {
          query: input.query,
          folder: input.folder,
          tags: input.tags,
          kind: input.kind,
          mediaType: input.media_type,
          limit: 10,
        });

      case 'update_library_asset':
        return this.library.update(userId, input.asset_id, {
          folder: input.folder,
          title: input.title,
          tags: input.tags,
          notes: input.notes,
        });

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
        await this.library.markUsed(userId, input.mediaUrls || []).catch(() => undefined);
        return { saved: true, draftId: draft.id, note: 'Saved as a draft. The provider must publish it.' };
      }

      case 'list_drafts': {
        const rows = await this.prisma.content.findMany({
          where: { userId, status: 'DRAFT' },
          orderBy: { updatedAt: 'desc' },
          take: 10,
          select: { id: true, title: true, caption: true, mediaUrls: true, aiMetadata: true, updatedAt: true },
        });
        return rows.map((row) => ({
          draftId: row.id,
          platform: this.draftPlatform(row.aiMetadata),
          title: row.title,
          caption: (row.caption || '').slice(0, 200),
          mediaUrls: this.parseList(row.mediaUrls),
          updatedAt: row.updatedAt,
        }));
      }

      case 'get_draft': {
        const row = await this.prisma.content.findFirst({ where: { id: input.draftId, userId } });
        if (!row) throw new Error('No draft with that id for this provider.');
        return {
          draftId: row.id,
          platform: this.draftPlatform(row.aiMetadata),
          status: row.status,
          title: row.title,
          caption: row.caption,
          body: row.body || '',
          hashtags: this.parseList(row.hashtags),
          mediaUrls: this.parseList(row.mediaUrls),
        };
      }

      case 'update_post_draft': {
        const changes = ['title', 'caption', 'body', 'hashtags', 'mediaUrls'].filter((k) => input[k] !== undefined);
        if (changes.length === 0) {
          // Without this, the model used an empty update as a way to read a draft.
          throw new Error('Nothing to change. To read a draft, use get_draft.');
        }
        const existing = await this.prisma.content.findFirst({
          where: { id: input.draftId, userId },
        });
        if (!existing) throw new Error('No draft with that id for this provider.');
        if (existing.status !== 'DRAFT') {
          throw new Error('That post is no longer a draft (it was scheduled or published), so it cannot be changed here.');
        }
        const platform = this.draftPlatform(existing.aiMetadata);
        const mediaUrls = input.mediaUrls ?? this.parseList(existing.mediaUrls);
        if (platform === 'instagram' && mediaUrls.length === 0) {
          throw new Error('Instagram posts need an image; keep the current one or pass a new URL.');
        }
        const updated = await this.prisma.content.update({
          where: { id: existing.id },
          data: {
            ...(input.title !== undefined ? { title: input.title } : {}),
            ...(input.caption !== undefined ? { caption: input.caption } : {}),
            ...(input.body !== undefined ? { body: input.body || null } : {}),
            ...(input.hashtags !== undefined ? { hashtags: JSON.stringify(input.hashtags) } : {}),
            ...(input.mediaUrls !== undefined ? { mediaUrls: JSON.stringify(input.mediaUrls) } : {}),
          },
        });
        drafts.push({
          id: updated.id,
          platform,
          title: updated.title,
          caption: updated.caption,
          body: updated.body || '',
          hashtags: this.parseList(updated.hashtags),
          mediaUrls,
          revised: true,
        });
        if (input.mediaUrls) await this.library.markUsed(userId, input.mediaUrls).catch(() => undefined);
        return { updated: true, draftId: updated.id, note: 'Draft revised. The provider must still publish it.' };
      }

      default:
        throw new Error(`Unknown tool: ${call.name}`);
    }
  }

  /** Stored JSON arrays (hashtags, mediaUrls) come back as strings. */
  private parseList(value: unknown): string[] {
    if (Array.isArray(value)) return value as string[];
    try {
      const parsed = JSON.parse(String(value || '[]'));
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  /** The platform the assistant saved a draft for, from its metadata. */
  private draftPlatform(aiMetadata: unknown): string | undefined {
    try {
      const meta = typeof aiMetadata === 'string' ? JSON.parse(aiMetadata) : aiMetadata;
      return (meta as any)?.platform;
    } catch {
      return undefined;
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

  /**
   * What a person said and read, with the drafts each reply made, so a reopened chat
   * shows its post cards again. Tool calls, results and reasoning are left out; drafts
   * are read as they are now (edited, scheduled or published since).
   */
  async getConversation(userId: string, id: string) {
    const conversation = await this.prisma.agentConversation.findFirst({
      where: { id, userId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');

    const visible = conversationView(conversation.messages);
    const ids = [...new Set(visible.flatMap((m) => m.draftIds))];
    const rows = ids.length
      ? await this.prisma.content.findMany({ where: { id: { in: ids }, userId } })
      : [];
    const byId = new Map(rows.map((row) => [row.id, {
      id: row.id,
      platform: this.draftPlatform(row.aiMetadata),
      title: row.title,
      caption: row.caption,
      body: row.body || '',
      hashtags: this.parseList(row.hashtags),
      mediaUrls: this.parseList(row.mediaUrls),
      status: row.status,
    }]));

    const messages = visible.map(({ role, text, draftIds }) => {
      const drafts = draftIds.map((d) => byId.get(d)).filter(Boolean);
      return drafts.length ? { role, text, drafts } : { role, text };
    });
    return { id: conversation.id, title: conversation.title, messages };
  }
}
