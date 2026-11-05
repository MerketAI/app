import { TemplateDefinition } from './types';
import { clinicProfileTemplate } from './clinic-profile.template';
import { photoHeroTemplate } from './photo-hero.template';

export const TEMPLATES: TemplateDefinition[] = [
  clinicProfileTemplate,
  photoHeroTemplate,
];

const BY_ID = new Map(TEMPLATES.map((t) => [t.id, t]));

export function getTemplate(id?: string | null): TemplateDefinition | null {
  return id ? (BY_ID.get(id) ?? null) : null;
}

/**
 * Picks an archetype when the caller has not named one.
 *
 * A photograph is the strongest asset a layout can have, so a photo-led
 * template wins whenever one is available; otherwise fall back to the dense
 * profile, which reads well with no imagery at all.
 */
export function selectTemplate(options: {
  templateId?: string | null;
  hasPhoto: boolean;
  category?: string | null;
}): TemplateDefinition {
  const explicit = getTemplate(options.templateId);
  if (explicit) return explicit;
  return options.hasPhoto ? photoHeroTemplate : clinicProfileTemplate;
}
