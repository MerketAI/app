import type {
  FormatId,
  SlotSpec,
  SlotValue,
  TemplateDefinition,
} from '@jasper/post-renderer';
import { CONCEPT_ICONS } from '../assets/icon-catalogue';

/**
 * Turning an Art Director's reply into something renderable, and deciding what
 * to throw away.
 *
 * Pure on purpose. This is the trust boundary between a language model and a
 * document that goes out under a doctor's name, so it is worth being able to
 * test exhaustively without an API key, a database or a browser.
 */

export interface ParsedDirection {
  templateId: string;
  format: FormatId;
  rationale: string;
  visibleSlots: string[];
  values: Record<string, SlotValue>;
}

export interface ParseResult {
  direction?: ParsedDirection;
  /** The plan cannot proceed. Worth one corrected retry. */
  fatal: string[];
  /** Something was dropped and the render continues without it. */
  corrections: string[];
}

/**
 * The templates a brief can actually be rendered with.
 *
 * An asset-sourced slot marked required cannot be filled by the model or by
 * the profile - only by the caller. A photo-led layout declares its photograph
 * required with `overflow: reject`, so offering one when no photograph was
 * supplied guarantees a wasted model call and then a failed render. Filtering
 * first is cheaper and clearer than arguing with the answer afterwards.
 */
export function candidateTemplates(
  templates: TemplateDefinition[],
  request: { photoUrl?: string; cutoutUrl?: string; templateId?: string },
): TemplateDefinition[] {
  const available = new Set<string>();
  if (request.photoUrl) available.add('heroImage');
  if (request.cutoutUrl) available.add('cutout');

  const renderable = templates.filter((template) =>
    Object.entries(template.slots).every(
      ([name, spec]) =>
        !(spec.required && spec.source === 'asset') || available.has(name),
    ),
  );

  if (!request.templateId) return renderable;
  return renderable.filter((t) => t.id === request.templateId);
}

/**
 * Parses and sanitises the model's reply.
 *
 * The rule that matters: a value for any slot not sourced from `campaign` is
 * discarded without being inspected. It does not matter whether the model's
 * phone number happens to be correct - it is not the model's to supply, and a
 * number that is merely plausible gets dialled by patients.
 */
export function parseArtDirection(
  raw: string,
  templates: TemplateDefinition[],
): ParseResult {
  const corrections: string[] = [];

  const json = extractJson(raw);
  if (!json) return { fatal: ['the reply was not JSON'], corrections };

  const template = templates.find((t) => t.id === json.templateId);
  if (!template) {
    return {
      fatal: [
        `"${String(json.templateId)}" is not one of the templates offered (${templates
          .map((t) => t.id)
          .join(', ')})`,
      ],
      corrections,
    };
  }

  let format = json.format as FormatId;
  if (!template.formats.includes(format)) {
    corrections.push(
      `format "${String(json.format)}" is not supported by ${template.id}; used ${template.referenceFormat}`,
    );
    format = template.referenceFormat;
  }

  const values: Record<string, SlotValue> = {};
  const supplied =
    json.values && typeof json.values === 'object'
      ? (json.values as Record<string, unknown>)
      : {};

  for (const [name, value] of Object.entries(supplied)) {
    const spec = template.slots[name];
    if (!spec) {
      corrections.push(`dropped "${name}": the template has no such slot`);
      continue;
    }

    if (spec.source !== 'campaign') {
      corrections.push(
        `dropped "${name}": it is supplied from the verified profile, not written here`,
      );
      continue;
    }

    const coerced = coerce(name, spec, value, corrections);
    if (coerced) values[name] = coerced;
  }

  const fatal: string[] = [];
  for (const [name, spec] of Object.entries(template.slots)) {
    if (spec.source === 'campaign' && spec.required && !values[name]) {
      fatal.push(`"${name}" is required by ${template.id} and is missing`);
    }
  }
  if (fatal.length > 0) return { fatal, corrections };

  const visibleSlots = Array.isArray(json.visibleSlots)
    ? (json.visibleSlots as unknown[]).filter(
        (slot): slot is string =>
          typeof slot === 'string' && Boolean(template.slots[slot]),
      )
    : [];

  return {
    direction: {
      templateId: template.id,
      format,
      rationale:
        typeof json.rationale === 'string' ? json.rationale.slice(0, 400) : '',
      visibleSlots,
      values,
    },
    fatal,
    corrections,
  };
}

/**
 * Checks one value against its slot.
 *
 * Over-long copy is kept: the fit pass shrinks it and the renderer reports the
 * overrun, which is better than refusing a design over a few characters.
 * Over-long *lists* are trimmed, because an extra item is not shrunk - it is
 * cut off at the edge of the zone, or it pushes the call to action off the page.
 */
function coerce(
  name: string,
  spec: SlotSpec,
  value: unknown,
  corrections: string[],
): SlotValue | null {
  if (!value || typeof value !== 'object') {
    corrections.push(`dropped "${name}": not an object`);
    return null;
  }
  const candidate = value as Record<string, unknown>;

  if (candidate.kind !== spec.kind) {
    corrections.push(
      `dropped "${name}": expected ${spec.kind}, received ${String(candidate.kind)}`,
    );
    return null;
  }

  switch (spec.kind) {
    case 'text': {
      const text = String(candidate.value ?? '').trim();
      return text ? { kind: 'text', value: text } : null;
    }

    case 'richtext': {
      const runs = Array.isArray(candidate.runs) ? candidate.runs : [];
      const cleaned = runs
        .map((run) => {
          const entry = (run ?? {}) as Record<string, unknown>;
          const text = String(entry.text ?? '').trim();
          return text ? { text, emphasis: Boolean(entry.emphasis) } : null;
        })
        .filter(Boolean) as { text: string; emphasis?: boolean }[];
      return cleaned.length > 0 ? { kind: 'richtext', runs: cleaned } : null;
    }

    case 'list': {
      const items = Array.isArray(candidate.items) ? candidate.items : [];
      let cleaned = items
        .map((item) => {
          const entry = (item ?? {}) as Record<string, unknown>;
          const label = String(entry.label ?? '').trim();
          if (!label) return null;
          const icon = entry.icon ? String(entry.icon).trim() : undefined;
          // A model asked to name an icon invents ids that resolve to nothing,
          // so only the closed vocabulary is accepted; the label stands alone.
          if (icon && !CONCEPT_ICONS[icon]) {
            corrections.push(
              `"${name}": icon concept "${icon}" is not in the vocabulary; the item is shown without a mark`,
            );
            return { label };
          }
          return icon ? { label, icon } : { label };
        })
        .filter(Boolean) as { label: string; icon?: string }[];

      if (cleaned.length === 0) return null;
      if (spec.maxItems && cleaned.length > spec.maxItems) {
        corrections.push(
          `"${name}": ${cleaned.length} items supplied, ${spec.maxItems} shown; the rest were cut`,
        );
        cleaned = cleaned.slice(0, spec.maxItems);
      }
      return { kind: 'list', items: cleaned };
    }

    case 'keyvalue': {
      const items = Array.isArray(candidate.items) ? candidate.items : [];
      let cleaned = items
        .map((item) => {
          const entry = (item ?? {}) as Record<string, unknown>;
          const label = String(entry.label ?? '').trim();
          const text = String(entry.value ?? '').trim();
          return label && text ? { label, value: text } : null;
        })
        .filter(Boolean) as { label: string; value: string }[];
      if (cleaned.length === 0) return null;
      if (spec.maxItems && cleaned.length > spec.maxItems) {
        cleaned = cleaned.slice(0, spec.maxItems);
      }
      return { kind: 'keyvalue', items: cleaned };
    }

    default:
      // Images and icons come from the asset layer, never from a model.
      corrections.push(
        `dropped "${name}": "${spec.kind}" values are not written by the Art Director`,
      );
      return null;
  }
}

/** Pulls the JSON object out of a reply, tolerating a code fence or preamble. */
function extractJson(raw: string): Record<string, any> | null {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(raw);
  const body = fenced ? fenced[1] : raw;
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(body.slice(start, end + 1));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed
      : null;
  } catch {
    return null;
  }
}
