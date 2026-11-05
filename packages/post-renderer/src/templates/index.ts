import clinicProfile01 from './clinic-profile-01.json';
import photoHero01 from './photo-hero-01.json';
import { TemplateDefinition } from '../schema/types';
import { validateTemplate } from '../schema/validate-template';

/**
 * Built-in templates, shipped as JSON.
 *
 * They are authored in exactly the form a database row will hold, so the
 * built-ins and anything a designer later adds through the admin panel travel
 * the same code path. Anything that only works because it was written in
 * TypeScript would be a gap the schema is hiding.
 */
const BUILT_IN_JSON: unknown[] = [clinicProfile01, photoHero01];

export interface TemplateLoadResult {
  templates: TemplateDefinition[];
  /** Templates that failed validation, with the reasons. */
  rejected: { id: string; issues: string[] }[];
}

/**
 * Loads and validates templates.
 *
 * Validation is not optional and not deferred: an invalid template is dropped
 * here rather than producing a broken render for a customer. The caller is told
 * which and why.
 */
export function loadTemplates(sources: unknown[] = BUILT_IN_JSON): TemplateLoadResult {
  const templates: TemplateDefinition[] = [];
  const rejected: { id: string; issues: string[] }[] = [];

  for (const source of sources) {
    const result = validateTemplate(source);
    const id =
      source && typeof source === 'object' && 'id' in source
        ? String((source as { id: unknown }).id)
        : '(unknown)';

    if (result.valid) {
      templates.push(source as TemplateDefinition);
    } else {
      rejected.push({
        id,
        issues: result.issues
          .filter((i) => i.severity === 'error')
          .map((i) => `${i.path}: ${i.message}`),
      });
    }
  }

  return { templates, rejected };
}

/** The built-ins, already validated. Throws if a shipped template is broken. */
export function builtInTemplates(): TemplateDefinition[] {
  const { templates, rejected } = loadTemplates();
  if (rejected.length > 0) {
    const detail = rejected
      .map((r) => `${r.id}: ${r.issues.join('; ')}`)
      .join('\n');
    throw new Error(`Built-in templates failed validation:\n${detail}`);
  }
  return templates;
}

export function findTemplate(id: string): TemplateDefinition | undefined {
  return builtInTemplates().find((t) => t.id === id);
}
