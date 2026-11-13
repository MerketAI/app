'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Download, RotateCcw } from 'lucide-react';
import {
  TYPE_PAIRS,
  buildPalette,
  builtInTemplates,
  iconPaintPlan,
  renderPostToHtml,
  validateAndInjectFacts,
  type AutofitReport,
  type ComposeInput,
  type FormatId,
  type TemplateDefinition,
} from '@jasper/post-renderer';

import { PostCanvas } from '@/components/design-studio/post-canvas';
import {
  DEFAULT_STATE,
  buildContent,
  useIcons,
  type StudioState,
} from '@/components/design-studio/studio-model';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

/**
 * Deterministic seed from the brand colour.
 *
 * Decorative shapes are seeded so a brand's blobs and confetti do not shift
 * between renders. Deriving the seed from the brand rather than from a clock
 * is what makes "identical inputs render identically" true in the studio too.
 */
function seedFor(brandColor: string): number {
  let hash = 0;
  for (let i = 0; i < brandColor.length; i++) {
    hash = (hash * 31 + brandColor.charCodeAt(i)) >>> 0;
  }
  return hash % 1000;
}

const TEMPLATES: TemplateDefinition[] = builtInTemplates();

const PROFILE_FIELDS: { key: keyof StudioState['profile']; label: string }[] = [
  { key: 'clinicName', label: 'Practice name' },
  { key: 'doctorName', label: 'Practitioner' },
  { key: 'qualifications', label: 'Qualifications' },
  { key: 'specialty', label: 'Specialty' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'website', label: 'Website' },
  { key: 'address', label: 'Address' },
];

export default function DesignStudioPage() {
  const [state, setState] = useState<StudioState>(DEFAULT_STATE);
  const [report, setReport] = useState<AutofitReport | null>(null);

  const template =
    TEMPLATES.find((t) => t.id === state.templateId) ?? TEMPLATES[0];
  const format = (
    template.formats.includes(state.format as FormatId)
      ? state.format
      : template.referenceFormat
  ) as FormatId;

  const palette = useMemo(() => buildPalette(state.brandColor), [state.brandColor]);
  const type = TYPE_PAIRS[template.theme.mood ?? 'clinical'];
  const paint = useMemo(() => iconPaintPlan(template, palette), [template, palette]);
  const icons = useIcons(state, paint);

  // The studio takes the same path a generated post does: campaign copy in,
  // protected facts overwritten from the profile, issues reported.
  const facts = useMemo(
    () =>
      validateAndInjectFacts(template, state.profile, {
        values: buildContent(state, template),
      }),
    [template, state],
  );

  const input: ComposeInput = useMemo(
    () => ({
      template,
      format,
      content: facts.resolved,
      palette,
      type,
      icons,
      seed: seedFor(state.brandColor),
    }),
    [template, format, facts.resolved, palette, type, icons, state.brandColor],
  );

  const setCopy = (key: keyof StudioState['copy'], value: string) =>
    setState((s) => ({ ...s, copy: { ...s.copy, [key]: value } }));
  const setProfile = (key: keyof StudioState['profile'], value: string) =>
    setState((s) => ({ ...s, profile: { ...s.profile, [key]: value } }));

  const downloadHtml = () => {
    // The exact document Puppeteer renders - auto-fit script included - so the
    // preview can be checked against the export by opening the file.
    const blob = new Blob([renderPostToHtml(input)], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${template.id}-${format}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const errors = facts.issues.filter((i) => i.severity === 'error');
  const warnings = facts.issues.filter((i) => i.severity === 'warning');

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b px-6 py-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/designs">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Designs
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-semibold">Template studio</h1>
            <p className="text-xs text-muted-foreground">
              Live preview on the shared renderer &mdash; what you see is what the
              export produces.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setState(DEFAULT_STATE)}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <Button size="sm" onClick={downloadHtml}>
            <Download className="mr-2 h-4 w-4" />
            Export HTML
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* ---------------- canvas ---------------- */}
        <section className="flex min-h-[420px] flex-1 flex-col bg-slate-100 p-6">
          <PostCanvas
            input={input}
            onReport={setReport}
            className="flex min-h-0 flex-1 items-center justify-center"
          />
          <FitSummary report={report} />
        </section>

        {/* ---------------- controls ---------------- */}
        <aside className="w-full shrink-0 space-y-6 overflow-y-auto border-l bg-white p-6 lg:w-[440px]">
          <Field label="Template">
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={template.id}
              onChange={(e) =>
                setState((s) => ({ ...s, templateId: e.target.value, format: '' }))
              }
            >
              {TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} &middot; v{t.templateVersion}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Format">
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={format}
                onChange={(e) => setState((s) => ({ ...s, format: e.target.value }))}
              >
                {template.formats.map((f) => (
                  <option key={f} value={f}>
                    {f.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Brand colour">
              <div className="flex gap-2">
                <input
                  type="color"
                  className="h-10 w-12 cursor-pointer rounded-md border border-input"
                  value={state.brandColor}
                  onChange={(e) =>
                    setState((s) => ({ ...s, brandColor: e.target.value }))
                  }
                />
                <Input
                  value={state.brandColor}
                  onChange={(e) =>
                    setState((s) => ({ ...s, brandColor: e.target.value }))
                  }
                />
              </div>
            </Field>
          </div>

          <Section title="Copy">
            <Field
              label="Eyebrow"
              hint="What the post announces, shown as a pill on layouts that have one."
            >
              <Input
                value={state.copy.eyebrow}
                onChange={(e) => setCopy('eyebrow', e.target.value)}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Headline">
                <Input
                  value={state.copy.headlinePlain}
                  onChange={(e) => setCopy('headlinePlain', e.target.value)}
                />
              </Field>
              <Field label="Emphasised">
                <Input
                  value={state.copy.headlineEmphasis}
                  onChange={(e) => setCopy('headlineEmphasis', e.target.value)}
                />
              </Field>
            </div>
            <Field label="Standfirst">
              <Textarea
                rows={2}
                value={state.copy.subheadline}
                onChange={(e) => setCopy('subheadline', e.target.value)}
              />
            </Field>
            <Field
              label="Services"
              hint="One per line, as “Label | icon-id”. Icons come from the permissive Iconify sets."
            >
              <Textarea
                rows={5}
                value={state.copy.services}
                onChange={(e) => setCopy('services', e.target.value)}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Services heading">
                <Input
                  value={state.copy.servicesTitle}
                  onChange={(e) => setCopy('servicesTitle', e.target.value)}
                />
              </Field>
              <Field label="Call to action">
                <Input
                  value={state.copy.cta}
                  onChange={(e) => setCopy('cta', e.target.value)}
                />
              </Field>
            </div>
            <Field
              label="Hours or event details"
              hint="One per line, as “Label | Value”. Becomes consulting hours on a profile layout, date and venue on an event one."
            >
              <Textarea
                rows={2}
                value={state.copy.timings}
                onChange={(e) => setCopy('timings', e.target.value)}
              />
            </Field>
            <Field
              label="Trust markers"
              hint="One per line. Shown as cards or as a highlights row, depending on the layout."
            >
              <Textarea
                rows={3}
                value={state.copy.badges}
                onChange={(e) => setCopy('badges', e.target.value)}
              />
            </Field>
          </Section>

          <Section
            title="Verified profile"
            hint="These are injected after generation. A model may choose whether a field is shown; it never supplies the value."
          >
            {PROFILE_FIELDS.map(({ key, label }) => (
              <Field key={key} label={label}>
                <Input
                  value={(state.profile[key] as string) ?? ''}
                  onChange={(e) => setProfile(key, e.target.value)}
                />
              </Field>
            ))}
          </Section>

          <Section title="Imagery">
            <Field
              label="Photograph URL"
              hint="Required by photo-led layouts. In production this is ingested into our own storage first."
            >
              <Input
                value={state.copy.photoUrl}
                onChange={(e) => setCopy('photoUrl', e.target.value)}
                placeholder="https://…"
              />
            </Field>
            <Field label="Photo credit">
              <Input
                value={state.copy.photoCredit}
                onChange={(e) => setCopy('photoCredit', e.target.value)}
              />
            </Field>
            <Field
              label="Practitioner cutout URL"
              hint="A transparent PNG of your own practitioner. Never a stock photo of a person — those licences carry no model release."
            >
              <Input
                value={state.copy.cutoutUrl}
                onChange={(e) => setCopy('cutoutUrl', e.target.value)}
                placeholder="https://…"
              />
            </Field>
          </Section>

          {(errors.length > 0 || warnings.length > 0 || facts.omitted.length > 0) && (
            <Section title="Validation">
              {errors.map((issue, i) => (
                <Note key={`e${i}`} tone="error">
                  <strong>{issue.slot}</strong> {issue.message}
                </Note>
              ))}
              {warnings.map((issue, i) => (
                <Note key={`w${i}`} tone="warning">
                  <strong>{issue.slot}</strong> {issue.message}
                </Note>
              ))}
              {facts.omitted.length > 0 && (
                <Note tone="muted">
                  Omitted, no value on file: {facts.omitted.join(', ')}
                </Note>
              )}
            </Section>
          )}
        </aside>
      </div>
    </div>
  );
}

/**
 * The per-zone fit report.
 *
 * Worth showing rather than hiding: a zone sitting at its minimum has fitted
 * only because it ran out of room to shrink, which is a design problem the
 * preview would otherwise disguise as a clean render.
 */
function FitSummary({ report }: { report: AutofitReport | null }) {
  if (!report) {
    return (
      <p className="mt-4 text-center text-xs text-muted-foreground">
        Measuring layout…
      </p>
    );
  }

  return (
    <div className="mt-4 shrink-0">
      <div className="mb-2 flex items-center gap-2 text-xs">
        <span
          className={
            report.ok
              ? 'rounded bg-emerald-100 px-2 py-0.5 font-medium text-emerald-800'
              : 'rounded bg-red-100 px-2 py-0.5 font-medium text-red-800'
          }
        >
          {report.ok ? 'Fits' : `Clipped: ${report.clippedZones.join(', ')}`}
        </span>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-600">
        {report.zones
          .filter((zone) => zone.elements.length > 0)
          .map((zone) => {
            const tight = zone.scale !== undefined && zone.scale <= 0.35;
            return (
              <span
                key={zone.zone ?? ''}
                className={
                  !zone.fitted
                    ? 'text-red-700'
                    : tight
                      ? 'text-amber-700'
                      : undefined
                }
                title={zone.elements
                  .map((e) => `${e.slot} ${Math.round(e.fontSize)}px`)
                  .join(', ')}
              >
                {zone.zone}{' '}
                {zone.scale !== undefined ? `${Math.round(zone.scale * 100)}%` : ''}
              </span>
            );
          })}
      </div>
    </div>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Note({
  tone,
  children,
}: {
  tone: 'error' | 'warning' | 'muted';
  children: React.ReactNode;
}) {
  const tones = {
    error: 'bg-red-50 text-red-800 border-red-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
    muted: 'bg-slate-50 text-slate-600 border-slate-200',
  };
  return (
    <p className={`rounded border px-2.5 py-1.5 text-[11px] ${tones[tone]}`}>
      {children}
    </p>
  );
}
