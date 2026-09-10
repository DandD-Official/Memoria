# TASK: Rebuild Memoria PDF + DOCX Export for Near Pixel-Perfect 1:1 MMD Preview Fidelity

You are working directly inside my existing **Memoria** codebase.

I want you to completely upgrade the PDF and Microsoft Word export system so that what the user sees inside the Memoria Markdown preview is reproduced in the exported document with the highest possible visual fidelity.

This is NOT a basic Markdown-to-PDF task.

This is NOT a text-only export task.

This is NOT acceptable if the exporter merely understands the information contained in the MMD.

The exported file must visually reproduce the rendered Memoria Markdown preview.

## PRIMARY GOAL

The rule for this entire task is:

> **THE WEB PREVIEW IS THE SOURCE OF TRUTH.**

If an element exists visually in the Memoria preview, it must exist visually in the exported PDF and Word document.

I want the export to be as close as technically possible to a screenshot-perfect reproduction of the rendered Memoria document.

That includes:

- fonts
- font sizes
- font weights
- italics
- bold text
- inline code
- code blocks
- headings
- heading borders
- paragraph spacing
- line spacing
- text colors
- background colors
- borders
- border radii
- shadows where appropriate
- callout colors
- icons
- SVGs
- diagrams
- uploaded images
- remote images
- captions
- tables
- table headers
- alternating table rows
- lists
- nested lists
- blockquotes
- links
- cards
- columns
- sections
- definitions
- examples
- summaries
- key concepts
- important blocks
- details blocks
- math
- image placeholders
- malformed-MMD error blocks
- alignment
- sizing
- whitespace
- nested layouts
- every supported Memoria Markdown element

Do not silently omit anything.

---

# FIRST: STUDY THE EXISTING IMPLEMENTATION

Before modifying code, inspect the entire relevant rendering and export pipeline.

At minimum inspect:

```text
components/mmd/renderer.tsx
components/mmd/node-list.tsx
components/mmd/inline-markdown.tsx

components/mmd/blocks/callout-block.tsx
components/mmd/blocks/educational-blocks.tsx
components/mmd/blocks/layout-blocks.tsx
components/mmd/blocks/media-blocks.tsx
components/mmd/blocks/diagram-block.tsx
components/mmd/blocks/image-request-block.tsx
components/mmd/blocks/svg-block.tsx
components/mmd/blocks/math-block.tsx
components/mmd/blocks/error-block.tsx

lib/mmd/parser.ts
lib/mmd/ast.ts
lib/mmd/spec-blocks.ts
lib/mmd/math.ts
lib/mmd/export-helpers.ts
lib/mmd/visuals.ts

lib/svg/sanitize.ts

lib/diagrams/*
lib/media/*

lib/pdf-export.ts
lib/word-export.ts

app/globals.css

.context/mmd-spec.md
.context/project-architecture.md
.context/diagram-system.md

tests/mmd-export-*
tests/pdf-export.test.ts
tests/book-export.test.ts
```

Also search the repository for every location that calls:

```text
buildMarkdownPdf
exportMarkdownToPdf
buildMarkdownWord
exportMarkdownToWord
MmdRenderer
```

Understand how reviewer, note, book, guest, public collection, and other exports currently work before changing interfaces.

Do not blindly rewrite code without understanding all call sites.

---

# CURRENT PROBLEMS THAT MUST BE REMOVED

The existing architecture has major fidelity limitations.

## 1. PDF export manually reconstructs content

`lib/pdf-export.ts` currently performs manual jsPDF drawing.

It contains logic such as:

```ts
stripInlineMarkdown(...)
writeParagraph(...)
renderMarkdownLines(...)
renderMmdNode(...)
```

This means the PDF renderer is effectively a completely different renderer from the actual React MMD renderer.

That architecture causes visual drift.

For example, bold/italic/code/link syntax can be converted to plain text instead of using the actual web appearance.

THIS MUST NO LONGER BE THE PRIMARY EXPORT STRATEGY.

---

## 2. Word export manually reconstructs content

`lib/word-export.ts` contains another separate implementation:

```ts
cleanInline(...)
markdownLines(...)
renderMmdNode(...)
```

Again, this means Memoria currently has multiple render engines:

```text
MMD source
   ↓
Web React renderer

MMD source
   ↓
PDF pseudo-renderer

MMD source
   ↓
DOCX pseudo-renderer
```

This guarantees inconsistency.

I do not want three independently maintained visual interpretations of MMD.

---

## 3. Images are currently replaced with placeholders

Current behavior such as:

```text
[Image not included in export: ...]
```

is NOT acceptable when the preview contains an actual image.

The real image must be included.

This applies to:

```text
https:// images
media:// images
ordinary Markdown images
gallery images
```

---

## 4. Diagrams are currently replaced with placeholders

Current behavior such as:

```text
[Diagram not available in export: ...]
```

is NOT acceptable if the diagram resolves correctly in the web preview.

If:

```mmd
:::diagram{id="network-1"}
:::
```

shows the actual diagram inside Memoria, export that actual diagram.

Resolve:

```text
/api/diagrams/:id/preview
```

or use the appropriate repository/API abstraction.

The resulting diagram must appear at the exact location it occupies in the rendered document.

---

## 5. Inline SVG is currently replaced with text

This is especially unacceptable.

Memoria explicitly supports:

```mmd
:::svg{alt="..." caption="..." align="..." size="..."}
<svg ...>
...
</svg>
:::
```

The web renderer already sanitizes the SVG using:

```ts
sanitizeSvgMarkup(...)
```

and renders the SVG.

PDF and Word must render the actual SVG visual.

NEVER replace a successfully sanitized/rendered SVG with:

```text
[SVG visual not included in export]
```

The SVG must be exported visually.

Maintain:

- aspect ratio
- viewBox
- paths
- shapes
- text
- fills
- strokes
- line widths
- opacity
- transforms
- coordinates
- clipping supported by the sanitizer
- alignment
- selected MMD size
- caption
- border/container around the SVG

The output should visually match what `SvgBlock` shows in the browser.

If Word cannot reliably render a particular SVG feature natively, rasterize the sanitized SVG at a sufficiently high resolution and insert the rendered result at the exact corresponding position.

Do not discard it.

---

# ARCHITECTURAL REQUIREMENT

## STOP USING THE EXPORTERS AS ANOTHER MMD RENDERER

The web rendering pipeline should become the primary visual source.

Conceptually:

```text
MMD source
    ↓
parseMmd()
    ↓
MMD AST
    ↓
MmdRenderer / MmdNodeList
    ↓
FULLY RESOLVED EXPORT DOM
    ↓
Asset normalization
    ↓
Print/page layout engine
    ↓
┌─────────────────┐
│ Canonical Pages │
└─────────────────┘
       ↓       ↓
      PDF     DOCX
```

The same resolved visual representation should drive BOTH PDF and visually faithful DOCX exports.

Do not independently guess how `:::warning`, `:::card`, `:::svg`, etc. should look inside each exporter.

Use the actual renderer and actual styles.

---

# CREATE A CANONICAL EXPORT SURFACE

Create a dedicated component/system, with an appropriate name such as:

```text
MmdExportSurface
ExportDocument
PrintableMmdRenderer
ResolvedMmdExport
```

Do not duplicate `MmdNodeList`.

Internally it should render the existing:

```tsx
<MmdRenderer content={content} />
```

or share the exact components used by it.

The export renderer should use the SAME:

```text
MmdRenderer
MmdNodeList
InlineMarkdown
CalloutBlock
DefinitionBlock
KeyConceptBlock
ExampleBlock
ImportantBlock
SummaryBlock
SectionBlock
CardBlock
ColumnsBlock
ColumnBlock
DetailsBlock
ImageBlock
GalleryBlock
DiagramPlaceholder
ImageRequestPlaceholder
SvgBlock
MathBlock
MmdErrorBlock
```

The output must receive the same `.memora-markdown` typography rules and visual variables as the real preview.

Do not create a fake simplified version of these components for exporting.

---

# EXPORT MODE

You may introduce an explicit rendering context such as:

```ts
type RenderMode = "screen" | "export";
```

or:

```tsx
<MmdExportProvider mode="export">
```

However, export mode must ONLY modify behavior that is impossible or meaningless on paper.

It MUST NOT redesign components.

For example:

### Allowed

A `<details>` block can be forced open.

A clickable image can become a normal non-clickable image.

Hover overlays can be removed.

Animations can be disabled.

Lightbox controls can be hidden.

Loading spinners should be replaced with the fully resolved final asset.

### NOT allowed

Changing card colors.

Replacing icons with words.

Stacking columns merely because it is easier.

Removing border radii.

Dropping an SVG.

Changing typography.

Removing callout backgrounds.

Replacing images with captions.

---

# ASSET RESOLUTION PHASE

Before generating ANY export, wait until the document is fully visually resolved.

Create something like:

```ts
await prepareMmdForExport(exportRoot);
```

It must do all of the following.

## Wait for fonts

Use:

```ts
await document.fonts.ready;
```

The export must not capture fallback fonts before the real fonts finish loading.

---

## Wait for images

Find every:

```html
<img>
```

inside the export surface.

Wait for:

```ts
img.decode()
```

when possible.

Do not export while images are still loading.

---

## Resolve `media://`

The renderer already maps:

```text
media://<id>
```

to:

```text
/api/media/<id>
```

Make the export system retrieve the actual bytes.

For exact rendering, normalize the resulting image into an export-safe embedded representation.

Do not leave a temporary authenticated URL that disappears when another export engine tries to read it.

---

## Resolve remote HTTP images

For:

```text
https://...
```

assets, the exporter must handle CORS correctly.

Do NOT simply hope that a canvas library can read the image.

Create an authenticated/safe asset-fetching pipeline or server-side proxy if required.

Validate MIME types and preserve the project's existing URL security model.

Convert retrieved assets into Blob/object URLs or data URIs for the isolated export surface if necessary.

NEVER use unsafe arbitrary URL fetching without SSRF protections.

---

## Resolve diagrams

For every:

```mmd
:::diagram{id="..."}
```

wait until diagram resolution finishes.

If the preview shows the actual diagram preview, export the actual diagram preview.

If possible, prefer SVG/vector output.

If the stored preview is SVG:

- preserve SVG when supported;
- otherwise rasterize it at high resolution.

If it is raster:

- preserve native dimensions/aspect ratio;
- avoid unnecessary quality degradation.

Only use the "Diagram not found" placeholder when the actual web preview itself is in the not-found state.

The export state must equal the preview state.

---

## Resolve inline SVG

For:

```mmd
:::svg
```

use the sanitized markup produced through the same security rules used by `SvgBlock`.

Do NOT parse a second, looser SVG version specifically for exporting.

The exact sanitized SVG shown by the app must be used.

When converting to an image:

1. preserve its `viewBox`;
2. determine its rendered browser dimensions;
3. render at minimum 2x device scale, preferably configurable;
4. preserve transparency;
5. use PNG only when native/vector SVG embedding is unavailable.

SVG text must not unexpectedly disappear because fonts were not ready.

---

# SUPPORT EVERY MMD V1 BLOCK

The exporter must have coverage for ALL currently supported MMD blocks.

That includes:

```text
note
tip
warning
danger
info
success

definition
key-concept
example
important
summary
math

section
card
columns
column
details

image
gallery
diagram
image-request
svg
```

Also support the existing ordinary Markdown features rendered through ReactMarkdown + remark-gfm:

```text
h1
h2
h3
h4
paragraphs
bold
italics
inline code
fenced code
links
unordered lists
ordered lists
nested lists
blockquote
horizontal rule
GFM tables
ordinary Markdown images
```

And support:

```text
mmd-error
```

exactly as shown in the preview.

---

# MMD CALLOUTS MUST MATCH

These currently have real visual identities in:

```text
components/mmd/blocks/callout-block.tsx
```

Do not convert them to:

```text
Warning
some paragraph
```

Reproduce the actual box.

Preserve:

- border
- background
- icon
- icon size
- icon color
- label capitalization
- label tracking
- padding
- gap
- title override
- nested Markdown
- body color
- rounded corners

Use the actual computed styling instead of inventing equivalent approximations.

---

# EDUCATIONAL BLOCKS MUST MATCH

Preserve the exact appearance of:

```text
DefinitionBlock
KeyConceptBlock
ExampleBlock
ImportantBlock
SummaryBlock
```

That includes their Lucide icons.

If the browser renders a Lucide icon as SVG, that SVG must also appear in the export.

Do NOT drop Lucide SVG icons during DOM cloning/capture.

This applies to every SVG icon inside the rendered preview, not only `:::svg`.

---

# CARDS MUST MATCH

For:

```mmd
:::card
```

preserve:

```text
default
outline
highlight
```

variants.

Preserve:

- border
- shadow
- background
- rounded-card radius
- title font
- subtitle
- icon text if provided
- padding
- nested content

---

# COLUMNS MUST STAY AS COLUMNS

The current implementation intentionally stacks columns during export.

REMOVE THIS LIMITATION.

If the preview shows:

```text
Column 1 | Column 2
```

the exported page should show:

```text
Column 1 | Column 2
```

If there are three columns, preserve all three when they fit at the intended export width.

Do not turn them into a vertical stack merely because manual jsPDF layout is difficult.

This is exactly why the browser-rendered DOM should become the source of truth.

Preserve:

```text
grid gaps
column widths
nested blocks
alignment
```

If a multi-column structure cannot fit at a page boundary, paginate the block intelligently rather than redesigning it.

---

# DETAILS BLOCK

For:

```mmd
:::details
```

the exported version should be visually consistent with the web component but forced OPEN.

Keep:

- outer border
- background
- padding
- title
- chevron/icon where appropriate
- expanded content
- typography

Interactive behavior obviously does not need to remain interactive.

Do not append ugly explanatory text such as:

```text
(expandable in-app)
```

unless that text is actually visible in the export design.

Visual fidelity is more important.

---

# IMAGE BLOCK

Respect:

```text
align="left|center|right"
size="small|medium|large|full"
caption
alt
```

The resulting exported image must use the same sizing logic as:

```ts
SIZE_CLASS
ALIGN_CLASS
```

inside `media-blocks.tsx`.

Preserve rounded borders and captions.

Do not include the web-only clickable button chrome if it is invisible in normal rendering.

---

# GALLERY

The gallery must remain a gallery.

The current browser implementation uses a responsive grid.

Export the visible grid layout.

Do not flatten every gallery item into sequential paragraphs.

Keep:

- square thumbnails
- object-cover behavior
- grid gaps
- borders
- row/column positioning

Remove only hover overlays/lightbox interaction.

---

# MATH

`MathBlock` already transforms the formula using:

```ts
renderMathFormula()
```

The export must visually reproduce the rendered math block.

Do not export:

```text
Math: \rightarrow
```

if the web preview displays the actual rendered symbol.

Preserve:

- rendered mathematical characters
- centered layout
- monospace font
- border
- background
- padding

---

# MARKDOWN FORMATTING

DO NOT use functions whose purpose is to remove formatting, such as the current:

```text
stripInlineMarkdown()
cleanInline()
```

for visual-fidelity exports.

The following:

```markdown
This is **very important**, this is *italic*, this is `code`,
and this is [a link](https://example.com).
```

must visually export as:

- bold
- italic
- styled inline code
- styled link

exactly like the browser preview.

---

# TABLES

Tables must reproduce the actual Memoria appearance from `app/globals.css`.

Preserve:

- full available width
- collapsed borders
- text size
- header background
- header font weight
- cell borders
- cell padding
- vertical alignment
- alternating row backgrounds
- text colors

Do not use a generic jsPDF AutoTable theme if that causes the exported table to differ from the preview.

The table should match the DOM table.

---

# CODE BLOCKS

Preserve the dark code block styling.

Current web styles include behavior equivalent to:

```text
dark ink background
white code text
rounded corners
padding
monospace
```

Do not transform code blocks into ordinary body paragraphs.

---

# BLOCKQUOTES

Match the browser design:

- accent-colored left border
- tinted background
- rounded right side
- padding
- italic text
- proper spacing

---

# COLORS AND CSS VARIABLES

Do not approximate colors manually if the browser already knows their final values.

Use computed styles wherever possible.

The export should resolve Memoria variables such as:

```text
--color-ink
--color-ink-soft
--color-accent
--color-accent-dark
--color-accent-soft
--color-line
--color-surface
```

into their actual computed values.

The exported output should therefore remain consistent if the design tokens are updated later.

Avoid hardcoded duplicate palettes in the export engine.

---

# LIGHT/DARK MODE

Documentation exports should use a deterministic export theme.

Unless the existing product has a specific export-theme preference, default to the Memoria **light document theme** so PDFs and Word documents are printable.

However, this must be implemented as a real canonical export theme, not by manually recoloring individual components inside PDF/DOCX code.

Render the entire export surface under the selected theme so all CSS variables resolve consistently.

If the product later allows:

```text
Export appearance:
- Light
- Match current theme
```

the architecture should support it.

---

# PAGINATION

Pagination must not randomly slice visually atomic content.

Implement print-aware pagination.

Prefer preserving these as units whenever they can fit on a page:

```text
callout
definition
key concept
example
important
summary
card
math block
image + caption
SVG + caption
diagram + caption
small gallery
details block
table row where practical
heading + following paragraph
```

Use rules such as:

```css
break-inside: avoid;
page-break-inside: avoid;
break-after: avoid;
```

where appropriate.

However:

If a block itself is taller than one full page, it MUST be allowed to split intelligently.

Never create an infinite blank page because `break-inside: avoid` prevents an oversized block from fitting.

Do not chop an SVG or image horizontally.

Avoid:

- orphan headings
- caption on a different page from image
- card title at bottom of page with card content on next page
- blank trailing pages
- clipped tables
- clipped columns
- content outside margins

---

# CANONICAL PAGE RENDERING

For strict fidelity, create a canonical intermediate page representation.

A strong architecture would be:

```text
MMD
 ↓
real MmdRenderer
 ↓
hidden isolated export root
 ↓
wait for fonts/assets/diagrams
 ↓
normalize dynamic DOM
 ↓
paginate
 ↓
render Page 1
render Page 2
render Page 3
...
```

These canonical visual pages can then be consumed by both exporters.

The key principle is:

> PDF and Word must consume the SAME rendered page representation instead of recreating the document independently.

---

# PDF REQUIREMENT

For PDF, prioritize visual fidelity over selectable/editable text if a compromise is necessary.

It is acceptable to rasterize canonical pages at high resolution if that is the only dependable way to guarantee that the PDF looks exactly like the Memoria preview.

However:

- use sufficiently high resolution;
- avoid blurry text;
- preserve SVG sharpness as much as possible;
- use at least 2x output scale;
- consider 3x for high-DPI export if file size remains reasonable;
- keep A4 dimensions accurate;
- do not stretch aspect ratio.

If a robust DOM-to-PDF solution can retain vector text and SVG while staying visually identical, prefer that.

But NEVER sacrifice visual correctness just to preserve selectable text.

---

# WORD / DOCX REQUIREMENT

DOCX is especially important.

Microsoft Word uses a different layout engine from browsers, so a semantic recreation using `Paragraph`, `TextRun`, etc. cannot guarantee browser-pixel-identical rendering.

Therefore implement **visual-fidelity DOCX** as the primary Word export mode.

Recommended architecture:

```text
Canonical browser-rendered A4 page
        ↓
high-resolution page image
        ↓
DOCX A4 page
        ↓
one exact page image positioned to fill that page
```

This provides the closest possible visual match between:

```text
Memoria preview
PDF
Word
```

Use the same page rendering pipeline for PDF and Word.

The image placed into Word must preserve the exact page aspect ratio and should not receive unexpected Word paragraph spacing/margins.

Configure:

```text
A4 page size
zero/controlled Word margins
zero paragraph before/after spacing
exact image width
exact image height
explicit page break between rendered pages
```

Test the result in actual Microsoft Word.

If desired, you may retain a secondary **Editable Word** mode using native `docx` elements, but it must NOT replace the high-fidelity mode requested here.

The default requested behavior is:

> fidelity first.

---

# SVG INSIDE DOCX

If using the canonical-page strategy, the sanitized SVG will already have been rendered into the page exactly where it belongs.

If you implement a native editable DOCX mode as well, use `ImageRun` with:

```text
type: "svg"
```

and provide a PNG fallback.

But the exported Word document must never replace an SVG with placeholder text.

---

# EXPORT RESOLUTION / QUALITY

Create a quality constant, for example:

```ts
const EXPORT_PIXEL_RATIO = 2;
```

or intelligently use:

```ts
Math.max(2, window.devicePixelRatio)
```

with a reasonable maximum to prevent memory crashes.

Large documents must not attempt to render one gigantic 50,000px canvas.

Render PAGE BY PAGE.

This is important.

Bad:

```text
entire document → one enormous canvas → crop
```

Better:

```text
page 1 → capture
release temporary canvas

page 2 → capture
release temporary canvas

page 3 → capture
...
```

This prevents memory exhaustion.

---

# DO NOT CROP A GIANT CANVAS BLINDLY

Avoid an implementation that:

1. captures the entire infinitely tall DOM;
2. slices the bitmap every A4 height;
3. cuts a callout/card/image directly through the middle.

Pagination must happen before or during page rendering.

---

# EXPORT WIDTH

Use a deterministic document viewport.

For A4 at CSS 96 DPI, an equivalent starting point is approximately:

```text
794 CSS px × 1123 CSS px
```

but do not blindly hardcode assumptions without understanding device scaling.

Create explicit constants/utilities for:

```text
page physical size
CSS export DPI
page pixel dimensions
page margins
content width
render scale
```

The preview content itself should not be redesigned to fit the page.

Use uniform scaling only if genuinely necessary.

Never independently alter component proportions.

---

# SOURCE PREVIEW VS EXPORT WIDTH

The exported content should represent the same Memoria document presentation, not whatever arbitrary width the user's monitor happens to have.

Create a canonical **document preview width** and use that same width for:

```text
on-screen document preview when appropriate
export preview
PDF
Word
```

This prevents responsive layout from causing:

```text
Web: 3 columns
PDF: 1 column
Word: 2 columns
```

for the same content.

If necessary, add an export-preview mode where the user can see the exact A4 representation before downloading.

---

# SCREEN-ONLY UI

Do NOT export application chrome.

Exclude things such as:

```text
sidebar
top navigation
edit buttons
export button
lightbox overlay
hover controls
loading animations
toolbars
editor controls
resize handles
focus outlines
interactive-only buttons
```

Only export the actual document/reviewer content.

Create selectors/classes such as:

```css
[data-export-ignore]
.export-screen-only
```

if useful.

---

# EXPORT-ONLY DOM NORMALIZATION

Before capture, clone or isolate the document.

Do NOT destructively modify the user's live preview.

For example:

```ts
const clone = source.cloneNode(true)
```

or use an isolated hidden React export surface.

The user should not see the page jumping between styles while an export happens.

---

# DETAILS AND ASYNC COMPONENT STATES

Never capture:

```text
Loading diagram…
```

if the diagram resolves 100 ms later.

Before rendering:

- wait for all diagrams;
- wait for all images;
- wait for fonts;
- wait for SVG insertion;
- wait for layout stabilization.

Use a deterministic ready-state system instead of arbitrary:

```ts
setTimeout(1000)
```

Do not rely on magic delays.

Consider an export readiness registry/context where asynchronous MMD blocks can report:

```text
loading
ready
error
```

Then export when all registered blocks have reached a terminal state.

---

# SECURITY MUST REMAIN INTACT

Do not weaken MMD security for exports.

Maintain:

```text
no rehype-raw
strict SVG sanitizer
no scripts
no event handlers
no javascript: URLs
no data: user input unless generated internally after validation
no foreignObject
no embedded executable HTML
URL validation
media authorization
diagram authorization
```

Exporting SVG must go through the SAME sanitizer as web rendering.

Do not create a "raw export SVG" bypass.

---

# ERROR BEHAVIOR

The existing MMD principle is:

> export must never silently lose content.

Keep that rule.

If malformed MMD generates an `mmd-error` block, export the same visible error block shown in the preview.

If an image fails to load and the preview shows an image-error state, export that error state.

If a diagram does not exist and the preview shows "Diagram not found", export that state.

The invariant should be:

```text
preview visual state === export visual state
```

---

# BRANDING

Do not automatically inject visual elements that make the content diverge from the preview.

The current PDF/Word exporters add Memoria branding/header/footer independently.

Review whether those elements belong to the intended exported document design.

If they should remain, implement them as part of the canonical export page layout so the user can preview the exact exported page.

Do not maintain completely separate brand rendering implementations for PDF and Word.

PDF and Word branding should also use the same source.

---

# CREATE A SINGLE EXPORT STYLE SHEET

Create an export stylesheet, for example:

```text
styles/mmd-export.css
app/mmd-export.css
```

or equivalent.

It should contain ONLY print/export behavior such as:

```css
@media print {
  ...
}
```

or export-container-specific overrides.

It must NOT duplicate the entire MMD visual system.

The existing React/Tailwind component styles remain authoritative.

---

# DEPENDENCIES

You may add a well-maintained dependency if necessary for:

- DOM capture
- paged layout
- SVG conversion
- image rasterization
- HTML rendering

Potential approaches may include technologies similar to:

```text
html-to-image
html2canvas
Paged.js
SVG → Canvas utilities
```

but DO NOT blindly install them.

First determine which library can correctly support:

- inline SVG
- external images
- CSS variables
- fonts
- borders
- rounded corners
- transforms
- nested grids
- high-DPI capture
- large documents

Use as few new dependencies as reasonably possible.

Do not introduce an abandoned library.

---

# REFACTOR THE OLD EXPORTERS

After the new system works, remove/deprecate the duplicated structural MMD visual logic from:

```text
lib/pdf-export.ts
lib/word-export.ts
lib/mmd/export-helpers.ts
```

where it is no longer needed.

Do not leave two competing implementations.

Functions such as:

```text
getSvgPlaceholderText
getImagePlaceholderText
getDiagramPlaceholderText
stripInlineMarkdown
cleanInline
```

should no longer drive successful visual exports.

Some fallback helpers may remain if they still have a real purpose for unresolved/error states.

---

# PRESERVE EXISTING PUBLIC APIS WHEN POSSIBLE

Audit all callers.

If existing code calls:

```ts
exportMarkdownToPdf(title, markdown)
```

and:

```ts
exportMarkdownToWord(title, markdown)
```

prefer maintaining easy-to-use wrappers.

The internals may become asynchronous:

```ts
await exportMarkdownToPdf(...)
await exportMarkdownToWord(...)
```

if asset resolution requires it.

Update every caller correctly.

Do not introduce unhandled promises.

---

# EXPORT PROGRESS

Since rendering may take time, expose proper export state.

For example:

```text
Preparing document…
Loading images…
Rendering page 1 of 8…
Creating PDF…
```

Do not allow users to repeatedly click Export while an export is in progress.

Use proper loading/disabled states.

Always restore the UI if an export fails.

---

# FILE NAME BEHAVIOR

Keep safe file-name sanitation.

Export:

```text
<title>.pdf
<title>.docx
```

unless existing product behavior requires otherwise.

Do not regress current Book, Note, Reviewer, Quiz, and other export filename conventions without reason.

---

# VISUAL REGRESSION FIXTURE

Create a dedicated MMD export torture-test fixture.

It should include ALL supported visual constructs in one document.

Example content should contain:

````mmd
# Memoria Export Fidelity Test

Normal paragraph with **bold**, *italic*, `inline code`, and [a link](https://example.com).

> This is a blockquote.

- List item
- Another item
  - Nested item

1. Ordered
2. List

---

:::note{title="Custom Note"}
Note content with **bold text**.
:::

:::tip
Tip body.
:::

:::warning
Warning body.
:::

:::danger
Danger body.
:::

:::info
Information.
:::

:::success
Success.
:::

:::definition{term="Normalization"}
Definition body.
:::

:::key-concept
This concept is important.
:::

:::example{title="Example 1"}
Example body.
:::

:::important
Important exam information.
:::

:::summary
Summary body.
:::

:::math{formula="A \\rightarrow B"}
:::

:::section{title="Section Title" subtitle="Section subtitle"}
Section body.
:::

:::card{title="Card" subtitle="Subtitle" type="default"}
Default card.
:::

:::card{title="Outline Card" type="outline"}
Outline.
:::

:::card{title="Highlight Card" type="highlight"}
Highlight.
:::

:::columns

:::column
## Column One
Content one.
:::

:::column
## Column Two
Content two.
:::

:::

:::details{title="Additional Information"}
This must be expanded during export.
:::

:::image{src="..." alt="Test image" caption="Image caption" align="center" size="medium"}
:::

:::gallery
...
:::

:::diagram{id="VALID_TEST_DIAGRAM" caption="Diagram caption"}
:::

:::image-request{purpose="Show packet flow" alt="Packet flow"}
:::

:::svg{alt="SVG test" caption="SVG caption" align="center" size="large"}
<svg ...>
...
</svg>
:::

| Column A | Column B |
|---|---|
| Value A | Value B |

```ts
const memoria = "export fidelity";
```
````

Use a valid local fixture for images and diagrams during automated tests rather than relying on `example.com`.

---

# SCREENSHOT-BASED VISUAL REGRESSION TESTING

Existing tests mostly check:

```text
does not throw
```

That is nowhere near enough for this feature.

Add visual regression tests.

Render the canonical preview fixture and compare it to the canonical exported page.

At minimum create:

```text
preview reference screenshot
PDF rendered page screenshot
DOCX page rendering where test infrastructure permits
```

Use pixel comparison or image similarity.

The tests should fail if:

- SVG disappears;
- image disappears;
- callout background disappears;
- card styling changes significantly;
- columns unexpectedly stack;
- bold text becomes plain;
- diagram becomes placeholder text;
- tables lose structure;
- content is clipped;
- page is blank.

Target an extremely high visual similarity.

Do not make thresholds so loose that obviously different exports pass.

---

# UNIT TEST: SVG MUST ACTUALLY EXIST

Add a regression test specifically proving that:

```mmd
:::svg{alt="Export SVG"}
<svg ...>
...
</svg>
:::
```

results in visible SVG-derived pixels/content in:

```text
PDF
DOCX
```

Do not merely test that export did not throw.

A placeholder string is a TEST FAILURE.

---

# UNIT TEST: DIAGRAM MUST ACTUALLY EXIST

Given a valid diagram:

```mmd
:::diagram{id="test-diagram"}
:::
```

assert that the resulting visual is included.

Placeholder-only output should fail.

---

# UNIT TEST: IMAGES

Test:

```text
ordinary Markdown image
:::image with https URL
:::image with media:// ID
gallery image
```

The successful export must contain rendered images.

---

# UNIT TEST: INLINE FORMATTING

Verify visually or structurally that:

```markdown
**bold**
*italic*
`code`
[link](...)
```

remain distinguishable.

This is specifically intended to prevent reintroduction of:

```ts
stripInlineMarkdown()
```

style behavior.

---

# UNIT TEST: COLUMNS

Render a two-column fixture.

Verify that both columns appear horizontally beside one another at the canonical export width.

A vertical stack should fail this regression test.

---

# EXPORT FAILURE HANDLING

If rendering fails, return a meaningful error.

Do not generate a partially corrupted document without informing the user.

For example:

```text
Could not export because 2 document assets failed to resolve.
```

However, if the web preview itself intentionally shows an error placeholder, that placeholder may be exported.

Differentiate:

```text
intentional preview error state
```

from:

```text
export engine unexpectedly failed
```

---

# PERFORMANCE

The exporter must work for realistic reviewer documents containing many pages.

Avoid:

```text
one massive canvas
duplicating every image repeatedly in memory
base64 conversion several times
keeping every intermediate canvas alive
```

Release resources as pages finish.

Use:

```ts
URL.revokeObjectURL(...)
```

where appropriate.

Clean temporary DOM nodes in `finally`.

---

# DO NOT DAMAGE EXISTING FEATURES

After implementation run:

```bash
npm run lint
npm run test
npm run build
```

All three MUST pass.

Fix existing tests that conflict because they describe the old intentionally-simplified export behavior.

Do not disable tests simply to make CI green.

Do not use:

```text
// @ts-ignore
eslint-disable everything
any everywhere
```

as shortcuts.

Keep TypeScript strict and maintainable.

---

# CODE QUALITY

Create clear modules rather than turning `pdf-export.ts` into a 2,000-line file.

A reasonable architecture may contain modules resembling:

```text
lib/export/
  constants.ts
  types.ts
  prepare-export.ts
  asset-resolver.ts
  svg-renderer.ts
  pagination.ts
  capture-page.ts
  pdf.ts
  docx.ts
  cleanup.ts

components/exports/
  mmd-export-surface.tsx
  export-progress.tsx
```

These names are suggestions, not mandatory.

Choose architecture appropriate to the repository.

---

# IMPORTANT DESIGN PRINCIPLE

If adding a new MMD component later requires developers to independently implement:

```text
one web version
one PDF version
one Word version
```

then this refactor has FAILED.

A future MMD visual component should ideally become exportable automatically because PDF/DOCX consume the rendered output.

That is the architecture I want.

---

# NON-NEGOTIABLE ACCEPTANCE CRITERIA

Do not consider the task complete until all of these are true:

1. The web MMD renderer is the primary source of visual truth.
2. PDF no longer depends on a simplified independent MMD visual interpretation.
3. Word's high-fidelity mode no longer depends on a simplified independent MMD visual interpretation.
4. `:::svg` produces the actual visual in PDF.
5. `:::svg` produces the actual visual in Word.
6. Lucide/component SVG icons remain visible.
7. Valid `:::diagram` blocks export their rendered diagram.
8. Valid `:::image` blocks export the real image.
9. `media://` assets work.
10. Remote HTTP(S) images work securely.
11. Standard Markdown images work.
12. Gallery layout is preserved.
13. Two/three-column MMD layouts remain columns.
14. Callouts visually resemble the web version.
15. Definitions visually resemble the web version.
16. Examples visually resemble the web version.
17. Important blocks visually resemble the web version.
18. Summary blocks visually resemble the web version.
19. Cards and their variants visually resemble the web version.
20. Details are exported expanded while retaining the component appearance.
21. Math displays the rendered expression instead of a textual placeholder.
22. Bold remains bold.
23. Italics remain italic.
24. Inline code remains styled.
25. Code blocks remain styled.
26. Tables retain their styling.
27. Blockquotes retain their styling.
28. Links retain their visual styling.
29. Captions stay attached to their media.
30. Content is not clipped at page boundaries.
31. No blank PDF pages.
32. No blank DOCX pages.
33. Long documents do not crash because of one enormous canvas.
34. Export waits for all asynchronous assets.
35. Export does not modify/jump the visible editor preview.
36. Malformed MMD remains visible rather than disappearing.
37. Security rules are not weakened.
38. PDF and Word use the same canonical rendered page representation wherever technically possible.
39. Visual regression tests exist.
40. `npm run lint`, `npm run test`, and `npm run build` all succeed.

---

# QUALITY STANDARD

When comparing:

```text
A. Memoria rendered preview
B. Exported PDF
C. Exported Microsoft Word file
```

I should immediately recognize them as the SAME DOCUMENT.

I do not want something that merely contains the same words.

I want:

> **same document, same visual language, same hierarchy, same components, same images, same diagrams, same SVGs, same layout.**

The PDF should approach pixel-perfect fidelity.

The Word export should prioritize visual fidelity even if achieving that requires page-level rendered images instead of fully editable Word elements.

Do not compromise the primary requirement just to preserve the old export implementation.

---

# IMPLEMENTATION PROCESS

Work through the implementation completely.

Do not stop after writing a proposal.

Do not just tell me what needs to change.

Actually modify the code.

First inspect and understand the architecture.

Then implement the shared export rendering pipeline.

Then integrate real asset resolution.

Then implement pagination.

Then implement PDF.

Then implement high-fidelity DOCX.

Then update every caller.

Then add visual/regression tests.

Then run lint/tests/build.

Then inspect and correct remaining discrepancies.

---

# FINAL RESPONSE REQUIRED FROM YOU

After implementation, give me a concise engineering report containing:

```text
FILES CREATED
FILES MODIFIED
OLD EXPORT LIMITATIONS REMOVED
NEW EXPORT PIPELINE
HOW SVG EXPORT NOW WORKS
HOW DIAGRAM EXPORT NOW WORKS
HOW IMAGE/MEDIA EXPORT NOW WORKS
HOW DOCX FIDELITY IS ACHIEVED
HOW PAGINATION WORKS
TESTS ADDED
LINT RESULT
TEST RESULT
BUILD RESULT
KNOWN LIMITATIONS, IF ANY
```

Do not claim "1:1" unless you actually validated the result.

If there is a remaining technical difference between browser rendering and Word/PDF, identify the exact difference rather than hiding it.

The priority throughout this task is **visual fidelity to the Memoria preview above everything else.**
