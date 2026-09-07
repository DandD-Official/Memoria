# AI Content and Visual Workflow

## Milestone 5 — complete

AI text generation for notes and reviewers uses the centralized MMD contract
from `lib/mmd/ai-instructions.ts`, generated from `spec-blocks.ts`. The prompt
requires one outer Markdown fence, valid supported MMD blocks, meaningful
visual restraint, accessible alt text, and no raw HTML or executable SVG.

Paste-back supports plain Markdown and clean fenced responses. It preserves
internal code fences. `analyzeReviewerImport()` also identifies commentary
outside an outer fence and shows a non-destructive warning in both reviewer
flows; it never guesses or drops source text. MMD parser errors are shown in
the preview before saving.

Quiz generation remains a separate JSON contract and is not routed through
MMD.

## Milestone 6 — complete, provider-free visuals

AI providers are text-only and use the user's configured API key only for
text generation. Memoria does not call OpenAI or another image-generation
provider.

The prompt exposes three valid visual outcomes:

1. `:::diagram{id="..."}` for an existing Memoria diagram.
2. `:::image{src="media://..." alt="..."}` or a real external HTTPS asset,
   including SVG files.
3. `:::image-request{purpose="..." alt="..."}` when no real asset exists.

In an editable preview, an image request can be fulfilled by uploading an
SVG/raster asset or creating a deterministic SVG template. Successful upload
stores owned bytes and replaces the exact request source with a persistent
`:::image{src="media://..."}` block. Read-only and guest views do not expose
owner-only upload actions.

Built-in safe SVG templates are concept card, process flow, and comparison.
Uploads accept SVG, PNG, JPEG, and WebP up to 5 MB. SVGs with scripts, event
handlers, `javascript:` URLs, or `foreignObject` are rejected.

## Synchronization and tests

The parser schema, prompt block list, editor templates, and reference guide
share the same block definitions. Tests cover prompt synchronization, outer
versus inner fences, ambiguous commentary, malformed MMD, visual-request
parsing, persistent media block generation, attribute escaping, and safe SVG
templates.
