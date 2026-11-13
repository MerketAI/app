import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import {
  CANVAS_FORMATS,
  type FormatId,
  type SlotSpec,
  type SlotValue,
  type TemplateDefinition,
} from '@jasper/post-renderer';
import { parseArtDirection } from './art-direction';
import { CredentialsService } from '../credentials/credentials.service';
import { CONCEPT_ICONS } from '../assets/icon-catalogue';

/**
 * The Art Director.
 *
 * It directs the design system; it does not draw. Given a brief and the
 * templates available, it chooses a layout and writes the campaign copy. It
 * never produces HTML, CSS, colours, coordinates or font sizes - those belong
 * to the template and the palette - and it is structurally incapable of
 * supplying a protected fact, because every slot sourced from the verified
 * profile is stripped from its output before anything is rendered.
 *
 * That last point is the whole design. A model asked for a clinic's phone
 * number will produce a plausible one, and a plausible phone number on a
 * doctor's flyer is dialled by patients. So the model is allowed to decide
 * *whether* a verified field appears, and nothing else about it.
 */

export interface ArtDirectorBrief {
  /** What the post is for: offer, awareness, event, health day, seasonal. */
  campaignType?: string;
  /** The specific occasion, e.g. "World Diabetes Day" or "monsoon clinic". */
  occasion?: string;
  /** Free-text direction from the caller. */
  instructions?: string;
  /** BCP-47-ish tag. Hindi, Tamil and other Indian languages are expected. */
  language?: string;
  /** Preferred canvas; the director may only pick one the template supports. */
  format?: FormatId;
  /** Force a template instead of letting the director choose. */
  templateId?: string;
}

/** Everything the director is told about the business. No contact details. */
export interface BusinessBrief {
  businessName?: string;
  industry?: string;
  subIndustry?: string;
  description?: string;
  city?: string;
  services?: string[];
  toneAttributes?: string[];
  tonePreference?: string;
  brandKeywords?: string[];
  uniqueSellingPoints?: string[];
  brandDonts?: string[];
  topicsToAvoid?: string[];
}

export interface ArtDirection {
  templateId: string;
  format: FormatId;
  /** One sentence on why this layout and this angle. For the audit trail. */
  rationale: string;
  /** Optional slots the director chose to show. */
  visibleSlots: string[];
  /** Campaign-authored values only. Profile slots are never present. */
  values: Record<string, SlotValue>;
  /** What was rejected from the model's output, and why. */
  corrections: string[];
  model: string;
}

const MAX_OUTPUT_TOKENS = 2000;

@Injectable()
export class ArtDirectorService {
  private readonly logger = new Logger(ArtDirectorService.name);

  constructor(private credentials: CredentialsService) {}

  async isConfigured(): Promise<boolean> {
    return Boolean(await this.credentials.get('ANTHROPIC_API_KEY'));
  }

  /**
   * Asks the director for a plan.
   *
   * `templates` is the catalogue it may choose from - already filtered by the
   * caller to what is actually renderable, so a photo-led layout is not even
   * offered when there is no photograph. Offering an impossible choice and
   * rejecting it afterwards wastes a call and invites the model to argue.
   */
  async direct(
    brief: ArtDirectorBrief,
    business: BusinessBrief,
    templates: TemplateDefinition[],
  ): Promise<ArtDirection> {
    if (templates.length === 0) {
      throw new BadRequestException(
        'No template can render this brief. A photo-led layout needs a photograph; supply one, or allow a layout that does not require it.',
      );
    }

    const apiKey = await this.credentials.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      throw new BadRequestException(
        'The Art Director needs ANTHROPIC_API_KEY. Set it in admin credentials.',
      );
    }

    const model =
      (await this.credentials.get('ART_DIRECTOR_MODEL')) || 'claude-sonnet-5-5';
    const client = new Anthropic({ apiKey });

    const system = this.systemPrompt(templates);
    const user = this.briefPrompt(brief, business, templates);

    let raw = await this.ask(client, model, system, user);
    let parsed = parseArtDirection(raw, templates);

    // One corrected retry. A model that put a phone number in the headline or
    // chose a template that does not exist usually fixes it when told exactly
    // what was wrong; a second failure is not worth paying for.
    if (parsed.fatal.length > 0) {
      this.logger.warn(
        `Art Director output rejected, retrying once: ${parsed.fatal.join('; ')}`,
      );
      raw = await this.ask(
        client,
        model,
        system,
        `${user}\n\nYour previous answer was rejected:\n- ${parsed.fatal.join('\n- ')}\n\nReturn corrected JSON. Output JSON only.`,
      );
      parsed = parseArtDirection(raw, templates);
    }

    if (parsed.fatal.length > 0) {
      throw new BadRequestException(
        `The Art Director could not produce a usable plan: ${parsed.fatal.join('; ')}`,
      );
    }

    return { ...parsed.direction!, corrections: parsed.corrections, model };
  }

  private async ask(
    client: Anthropic,
    model: string,
    system: string,
    user: string,
  ): Promise<string> {
    const response = await client.messages.create({
      model,
      max_tokens: MAX_OUTPUT_TOKENS,
      system,
      messages: [{ role: 'user', content: user }],
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    if (!text.trim()) {
      throw new BadRequestException('The Art Director returned nothing.');
    }
    return text;
  }

  // -------------------------------------------------------------------------
  // Prompting
  // -------------------------------------------------------------------------

  private systemPrompt(templates: TemplateDefinition[]): string {
    return [
      'You are an art director for small healthcare and local-service businesses in India.',
      'You choose a layout from a fixed catalogue and write the copy that fills it.',
      '',
      'You do not draw, and you do not design. There is no HTML, no CSS, no colours,',
      'no coordinates and no font sizes in your output. The template owns all of that.',
      '',
      'HARD RULES',
      '1. Never write a phone number, email address, website, postal address, booking link,',
      '   practitioner name, qualification or registration number. Those are verified facts',
      '   held elsewhere and are placed into the design after you. Writing one is a',
      '   rejection, not a style note: an invented number on a clinic flyer gets dialled.',
      '2. Use only the slots the chosen template declares, and respect every stated limit.',
      '   A headline past its character limit is shrunk until it fits and ends up unreadable.',
      '3. Make no clinical claim, promise no outcome, and give no dosage or diagnosis.',
      '4. Write in the requested language. If it is not English, write it natively -',
      '   do not write English and transliterate.',
      '5. Pick icons only from the supplied concept list. Any other name resolves to nothing.',
      '',
      `Templates available: ${templates.map((t) => t.id).join(', ')}.`,
      '',
      'Answer with a single JSON object and nothing else - no prose, no code fence.',
      '',
      '{',
      '  "templateId": "<one of the ids above>",',
      '  "format": "<one of the formats that template lists>",',
      '  "rationale": "<one sentence: why this layout and this angle>",',
      '  "visibleSlots": ["<optional slots you want shown>"],',
      '  "values": {',
      '    "<slot>": { "kind": "text", "value": "..." },',
      '    "<slot>": { "kind": "richtext", "runs": [{"text": "..."}, {"text": "...", "emphasis": true}] },',
      '    "<slot>": { "kind": "list", "items": [{"label": "...", "icon": "<concept>"}] },',
      '    "<slot>": { "kind": "keyvalue", "items": [{"label": "...", "value": "..."}] }',
      '  }',
      '}',
      '',
      'In a richtext headline the emphasised run is the part that carries the message;',
      'it is painted in a contrasting colour, so it should be a phrase, not a stray word.',
    ].join('\n');
  }

  private briefPrompt(
    brief: ArtDirectorBrief,
    business: BusinessBrief,
    templates: TemplateDefinition[],
  ): string {
    const lines: string[] = ['THE BRIEF'];
    if (brief.campaignType) lines.push(`Campaign type: ${brief.campaignType}`);
    if (brief.occasion) lines.push(`Occasion: ${brief.occasion}`);
    lines.push(`Language: ${brief.language || 'English'}`);
    if (brief.instructions) lines.push(`Direction: ${brief.instructions}`);

    lines.push('', 'THE BUSINESS');
    const put = (label: string, value?: string | string[] | null) => {
      if (!value) return;
      const text = Array.isArray(value) ? value.join(', ') : value;
      if (text.trim()) lines.push(`${label}: ${text}`);
    };
    put('Name', business.businessName);
    put('Industry', [business.industry, business.subIndustry].filter(Boolean).join(' / '));
    put('About', business.description);
    put('City', business.city);
    put('Services', business.services);
    put(
      'Tone',
      [business.tonePreference, ...(business.toneAttributes || [])].filter(
        (t): t is string => Boolean(t),
      ),
    );
    put('Key themes', business.brandKeywords);
    put('What makes them different', business.uniqueSellingPoints);
    put('Never do this', business.brandDonts);
    put('Avoid these topics', business.topicsToAvoid);

    lines.push('', 'TEMPLATES');
    for (const template of templates) {
      lines.push('', `## ${template.id} - ${template.title}`);
      if (template.description) lines.push(template.description);
      lines.push(`Formats: ${template.formats.map((f) => this.describeFormat(f)).join(', ')}`);
      if (template.campaignTypes?.length) {
        lines.push(`Suits: ${template.campaignTypes.join(', ')}`);
      }
      lines.push('Slots you write:');
      for (const [name, spec] of Object.entries(template.slots)) {
        if (spec.source !== 'campaign') continue;
        lines.push(`  - ${name}: ${this.describeSlot(spec)}`);
      }
      const supplied = Object.entries(template.slots)
        .filter(([, spec]) => spec.source !== 'campaign')
        .map(([name]) => name);
      if (supplied.length > 0) {
        lines.push(
          `Placed for you, do not write: ${supplied.join(', ')}. List them in "visibleSlots" to show them.`,
        );
      }
    }

    lines.push(
      '',
      'ICON CONCEPTS',
      Object.keys(CONCEPT_ICONS).sort().join(', '),
    );

    if (brief.templateId) {
      lines.push('', `The caller requires template "${brief.templateId}".`);
    }
    if (brief.format) {
      lines.push(`The caller requires format "${brief.format}".`);
    }

    return lines.join('\n');
  }

  private describeFormat(format: FormatId): string {
    const canvas = CANVAS_FORMATS[format];
    return canvas ? `${format} (${canvas.width}x${canvas.height})` : format;
  }

  private describeSlot(spec: SlotSpec): string {
    const parts: string[] = [spec.kind];
    parts.push(spec.required ? 'required' : 'optional');
    if (spec.maxChars) parts.push(`max ${spec.maxChars} characters`);
    if (spec.maxLines) parts.push(`max ${spec.maxLines} lines`);
    if (spec.maxItems) parts.push(`max ${spec.maxItems} items`);
    if (spec.maxItemChars) parts.push(`max ${spec.maxItemChars} characters per item`);
    const text = parts.join(', ');
    return spec.description ? `${text}. ${spec.description}` : text;
  }

}
