import {
  PROTECTED_FIELDS,
  ProtectedField,
  VerifiedProfile,
  readProtectedField,
} from '../schema/protected-fields';
import {
  CampaignContent,
  SlotSpec,
  SlotValue,
  TemplateDefinition,
} from '../schema/types';

export interface FactIssue {
  slot: string;
  field?: ProtectedField;
  message: string;
  severity: 'error' | 'warning';
}

export interface FactValidationResult {
  valid: boolean;
  issues: FactIssue[];
  /** Slot values with every protected fact replaced by the verified value. */
  resolved: Record<string, SlotValue>;
  /** Slots dropped because the profile has no value and they are optional. */
  omitted: string[];
}

/**
 * Injects verified facts and rejects any attempt by the Art Director to author
 * one.
 *
 * The model chooses *whether* a verified field is shown. It never supplies the
 * value: after generation every profile-sourced slot is overwritten from the
 * profile, and any model-supplied value that differs is reported. A generated
 * phone number that merely looks plausible is the failure mode this exists to
 * prevent - it is published under a doctor's name and patients dial it.
 */
export function validateAndInjectFacts(
  template: TemplateDefinition,
  profile: VerifiedProfile,
  content: CampaignContent,
): FactValidationResult {
  const issues: FactIssue[] = [];
  const resolved: Record<string, SlotValue> = {};
  const omitted: string[] = [];

  const visible = content.visibleSlots
    ? new Set(content.visibleSlots)
    : null;

  for (const [slotName, spec] of Object.entries(template.slots)) {
    const supplied = content.values[slotName];

    // The model may hide an optional slot; it may not hide a required one.
    const hiddenByModel = visible !== null && !visible.has(slotName);
    if (hiddenByModel && spec.required) {
      issues.push({
        slot: slotName,
        message: 'Required slot was excluded from visibleSlots.',
        severity: 'error',
      });
    }

    if (spec.source === 'profile') {
      const outcome = resolveProfileSlot(slotName, spec, profile, supplied, issues);
      if (outcome.omit) {
        omitted.push(slotName);
      } else if (outcome.value) {
        resolved[slotName] = outcome.value;
      }
      continue;
    }

    // Non-profile slots carry model or platform copy.
    if (hiddenByModel) {
      omitted.push(slotName);
      continue;
    }

    if (!supplied) {
      if (spec.required) {
        issues.push({
          slot: slotName,
          message: 'Required slot has no value.',
          severity: 'error',
        });
      } else if (spec.fallback === 'placeholder' && spec.placeholder) {
        resolved[slotName] = { kind: 'text', value: spec.placeholder };
      } else {
        omitted.push(slotName);
      }
      continue;
    }

    if (!kindMatches(spec, supplied)) {
      issues.push({
        slot: slotName,
        message: `Slot expects "${spec.kind}" but received "${supplied.kind}".`,
        severity: 'error',
      });
      continue;
    }

    // Campaign copy must not smuggle in a contact detail: those belong in
    // profile-sourced slots where they are verifiable. Asset-sourced values are
    // platform-supplied (a stock photo credit may legitimately be a URL), so
    // the check applies only to what the model wrote.
    const leaked = spec.source === 'campaign' ? findContactLeak(supplied) : null;
    if (leaked) {
      issues.push({
        slot: slotName,
        message: `Campaign copy contains what looks like a ${leaked}. Contact details must come from the verified profile.`,
        severity: 'error',
      });
      continue;
    }

    resolved[slotName] = supplied;
  }

  // Values for slots the template does not declare are dropped, not rendered.
  for (const slotName of Object.keys(content.values)) {
    if (!template.slots[slotName]) {
      issues.push({
        slot: slotName,
        message: 'Value supplied for a slot this template does not declare; ignored.',
        severity: 'warning',
      });
    }
  }

  return {
    valid: issues.every((i) => i.severity !== 'error'),
    issues,
    resolved,
    omitted,
  };
}

function resolveProfileSlot(
  slotName: string,
  spec: SlotSpec,
  profile: VerifiedProfile,
  supplied: SlotValue | undefined,
  issues: FactIssue[],
): { value?: SlotValue; omit?: boolean } {
  const field = spec.profileField;
  if (!field) {
    issues.push({
      slot: slotName,
      message: 'Profile-sourced slot declares no profileField.',
      severity: 'error',
    });
    return { omit: true };
  }

  const verified = readProtectedField(profile, field);

  // Report the attempt even though the value is overwritten either way: a model
  // trying to author a protected fact is a signal worth surfacing.
  if (supplied && supplied.kind === 'text' && supplied.value.trim()) {
    if (!verified) {
      issues.push({
        slot: slotName,
        field,
        message: `A value was supplied for protected field "${field}", but the profile has none. Discarded.`,
        severity: 'error',
      });
    } else if (normalise(supplied.value) !== normalise(verified)) {
      issues.push({
        slot: slotName,
        field,
        message: `Supplied value for protected field "${field}" does not match the verified profile. Overwritten with the verified value.`,
        severity: 'error',
      });
    }
  }

  if (!verified) {
    if (spec.required) {
      issues.push({
        slot: slotName,
        field,
        message: `Required protected field "${field}" is absent from the verified profile.`,
        severity: 'error',
      });
      return { omit: true };
    }
    if (spec.fallback === 'placeholder' && spec.placeholder) {
      return { value: { kind: 'text', value: spec.placeholder } };
    }
    return { omit: true };
  }

  return { value: { kind: 'text', value: verified } };
}

function kindMatches(spec: SlotSpec, value: SlotValue): boolean {
  if (spec.kind === value.kind) return true;
  // A richtext slot accepts plain text; it is rendered as a single run.
  if (spec.kind === 'richtext' && value.kind === 'text') return true;
  return false;
}

/** Returns what kind of contact detail leaked into campaign copy, if any. */
function findContactLeak(value: SlotValue): string | null {
  const texts: string[] = [];
  if (value.kind === 'text') texts.push(value.value);
  if (value.kind === 'richtext') texts.push(...value.runs.map((r) => r.text));
  if (value.kind === 'list') texts.push(...value.items.map((i) => i.label));
  if (value.kind === 'keyvalue') {
    texts.push(...value.items.flatMap((i) => [i.label, i.value]));
  }

  for (const text of texts) {
    if (/[\w.+-]+@[\w-]+\.[\w.]{2,}/.test(text)) return 'email address';
    if (/https?:\/\/|\bwww\./i.test(text)) return 'website address';
    const digits = text.replace(/[^\d]/g, '');
    if (digits.length >= 8 && /[\d][\d\s()+-]{7,}/.test(text)) {
      return 'phone number';
    }
  }
  return null;
}

/** Compares on visible content, ignoring spacing and case. */
function normalise(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toLowerCase();
}

/** Convenience: which protected fields a template actually renders. */
export function protectedFieldsUsed(
  template: TemplateDefinition,
): ProtectedField[] {
  const used = new Set<ProtectedField>();
  for (const spec of Object.values(template.slots)) {
    if (spec.profileField) used.add(spec.profileField);
  }
  return PROTECTED_FIELDS.filter((f) => used.has(f));
}
