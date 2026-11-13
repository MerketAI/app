# @jasper/post-renderer

One rendering engine, two environments:

- **Next.js**, for the live editable preview
- **Node + Puppeteer**, for PNG/PDF export

There is no second implementation. `composePost` builds the React tree and
`postDocumentStyles` supplies the stylesheet; the export serialises them into a
document, the preview mounts them in a page. The parity test asserts the two
are pixel-identical, which only holds while both take their layout and their
CSS from here.

```
template JSON -> fact injection -> React composition -> HTML -> export
```

The live preview is the Template studio at `/dashboard/designs/studio` in the
frontend app. It mounts `composePost` inside an iframe carrying
`postDocumentStyles`, and runs the fit pass with `runAutofit` - the same script
the export inlines. The iframe is not decoration: the shared stylesheet is
document-scoped, and the fit pass measures a document, so running it inside the
dashboard would measure the dashboard's cascade instead of the export's.

## Running the tests

```bash
npm test             # schema, validation and markup. Seconds, no browser.
npm run test:browser # visual regression, overflow and parity. Minutes, needs Chrome.
```

The browser suite is deliberately out of `npm test`: it launches Chrome and
renders every stress case. Run it before shipping any change to the templates,
the compositor or the auto-fit pass.

```bash
JASPER_UPDATE_BASELINES=1 npm run test:browser   # re-record after an intended design change
```

Baselines live in `src/tests/baselines/` and are compared with a budget of
0.05% of the canvas - rasterisation is not bit-exact across Chrome patch
releases, but a real design change moves tens of thousands of pixels.

Two cases (`*-overflowing`) are **controls**: they are built to be unfittable
and the suite fails if they come back clean. Without them a report that always
said "fits" would pass every other test in the file.

Webfonts are cached to `test-cache/fonts/` on first run. Google throttles
partway through a run otherwise, and a throttled import does not fail loudly -
the page silently renders in a fallback face with different metrics, the
auto-fit pass settles on different type sizes, and the baselines stop matching
for no reason anyone can see.

### When a case fails

```bash
CASE=a4-long-name npx ts-node \
  --compiler-options '{"module":"commonjs","jsx":"react"}' \
  src/tests/support/diagnose.ts
```

Prints which faces loaded, the per-zone fit report, and every child's box,
padding and font size for any zone still overflowing. Rendered PNGs from the
last run are in `test-output/`.

## Two rules the code enforces rather than documents

**The Art Director never authors a protected fact.** Doctor name,
qualifications, registration number, specialty, clinic name, phone, email,
website, address and booking URL come from the verified profile after
generation. A model may choose whether a verified field is *shown*; it may not
supply the value. A generated phone number that merely looks plausible is
published under a doctor's name and patients dial it.

**Database templates are data, not code.** `validateTemplate` rejects unknown
components and style properties, `url()`, `@import`, `javascript:` and
`expression()`, protected fields with a non-profile source, contact details
hardcoded into literal text, and zones outside the canvas. A template that
fails validation is never activated.

## Auto-fit

Fixed canvas plus tenant-supplied copy means overflow is inevitable, so
`window.__fitDesign()` shrinks text until it fits and reports what it did.
Three properties matter:

- **It runs after webfonts settle.** Text metrics are not final before then.
- **It fits per zone, not per element.** Shrinking a headline cannot resolve a
  zone whose overflow comes from the standfirst below it, so everything
  shrinkable in a zone moves together along one scale factor, each within its
  own declared bounds.
- **It shrinks; it never grows.** The upper bound is the size the template was
  designed at. The slot's `minFontSize`/`maxFontSize` are safety limits on that
  design, not a target to grow into.

A zone reported at `scale=0` fitted only because it ran out of room to shrink.
That is a design problem, not a pass.

## Templates

| id | What it is for |
|---|---|
| `clinic-profile-01` | A4 practice profile: services, hours, trust markers, contact footer. |
| `photo-hero-01` | Photo-led social post. Requires a photograph. |
| `event-notice-01` | Camps, awareness days, offers. Date/venue panel, named practitioner, **no photograph needed**. |

The third is there because the first two left the catalogue with nothing to
offer a social brief that has no photograph. `templates.test.ts` asserts a
photograph-free social layout exists, so the gap cannot quietly reopen.

## Stack repacking

Zones sharing a `stack` name are repacked vertically against their measured
content once the fit pass has settled. Absolute positioning is what gives these
layouts their composition, and also why an omitted section leaves a hole -
nothing reflows into the gap, so a flyer whose consulting hours were correctly
left out renders a void in the middle of itself.

Two details matter. Content height is measured from the children, not from
`scrollHeight`, which never reports less than the box and so has nothing to
reclaim. And repacking only ever moves a zone *up*: content that could not be
shrunk enough must never push the next zone down into a pinned footer.

`stackAlign: "center"` lets a short stack sit in the middle of its envelope
rather than clinging to the top - the difference between a sparse post and a
sheet of white with a sentence on it. The envelope comes from the template, not
the DOM: zones with no content are not rendered, so measuring from the
survivors would centre a lone headline inside its own box.

Worth knowing about the suite above: it detects too much content and is blind
to too little. `a4-sparse` passed every assertion while two-thirds empty.
