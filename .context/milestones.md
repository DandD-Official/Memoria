# MMD Milestone Tracking

## Current status — 2026-09-10

All implementation milestones are complete for the current v1 scope. The
repository now includes the native SVG diagram editor, persisted diagram
previews, owned media uploads, visual/creative reviewer prompting, PPTX
imports, and safe normalization of AI-authored SVG markup. The remaining
release validation is environmental: a signed-in browser smoke test against
a reachable seeded database.

Verification on 2026-09-10: `npm.cmd run db:deploy` applied the pending PPTX
migration to the configured Neon database; ESLint passes; all 152 tests pass
across 27 files; TypeScript no-emit passes; and `next build` passes. Public
production routes respond locally, while `/api/health` reports the database
as unavailable from this runtime and the in-app browser is unavailable, so a
signed-in visual smoke test cannot be completed in this environment.

The older historical notes below intentionally preserve the original build
log; when they conflict with this section, this section is authoritative.

Last updated: 2026-09-10 (release verification and current feature pass).

## Books redesign and permission follow-up — 2026-09-08

Status: Implemented; migration application and signed-in visual smoke testing
remain environment checks.

The Books shell is now a reading-first studio and reader rather than a renamed
Collection screen. It includes simulated cover/page spreads, custom subtitle and
contents heading, contents-first navigation, chapter ordering, saved per-user
last chapter, Book favorites, and dedicated PDF/DOCX cover templates. The studio
uses separate Book, Chapters, and Details views; the reader separates reading
from discussion, and phones move from Contents to one chapter at a time. Book
surfaces and text now use semantic theme tokens for readable light/dark contrast.
Export and Share are the only top-right studio actions.

Sharing moved into one accessible modal with “Anyone with the link” and “Add
people” methods. Both persist Viewer/Editor permission. Owners alone manage
sharing and deletion; editors can change Book copy and chapter structure without
seeing unrelated owner resources; viewers remain read-only. Link editors must
authenticate before mutation. Shared with Me routes Book editors to the studio
and viewers to the reader.

Persistence remains safely additive through the documented compatibility layer;
see `books.md` and migration
`20260908193000_add_book_sharing_permissions`. Authorization and Book export
tests were added. `.context/personal-context.md` was re-read after it was
populated, and its Book-specific TOC, resume, permission, export, mobile, and
visual direction is reflected here.

Verification: ESLint passes with zero warnings, TypeScript passes, Prisma schema
validation passes, all 133 tests across 22 files pass, and `next build` passes.
The package build's preliminary `prisma generate` step can be blocked on Windows
when an existing Node process holds Prisma's query-engine DLL; the generated
client and direct production build were verified without stopping that unrelated
process.

## Upgrade brief — Milestone 1: Design System & Responsive Foundation

Status: Complete — rebuilt as a full shared-system pass.

Files changed/added:
  `tailwind.config.ts`, `app/globals.css`, `app/(app)/layout.tsx`, the
  Dashboard/Memories/Reviewers/Quizzes pages, note/reviewer detail headers,
  `components/ui/{button,card,input,badge,empty-state,loading-state,dialog,
  sheet,select,page,responsive-table}.tsx`,
  `components/library/{library-navigation,resource-card}.tsx`, and both MMD
  Markdown rendering paths.

Delivered:
  - named typography, spacing, semantic color, radius, surface, elevation,
    and motion tokens with light/dark values;
  - shared responsive PageShell/PageHeader/SectionHeader composition;
  - a reusable ResourceCard language with distinct Memory and Book surfaces;
  - unified button/link, card, badge, input, textarea, select, empty, loading,
    pagination, dialog, and sheet behavior;
  - focus-trapped, Escape-dismissible overlays with focus restoration and
    mobile bottom-sheet geometry;
  - page-level overflow containment, wrapping action groups, bounded media,
    and `min-width: 0` safeguards;
  - reduced-motion support for both the saved app preference and OS setting;
  - semantic, keyboard-focusable contained tables with a mobile scroll hint,
    used by reviewer tables and both Markdown/MMD rendering paths;
  - core adoption on Dashboard, Memories, Reviewers, and Quizzes rather than
    leaving the design system as unused primitives.

Migrations added: none.
Tests added: none; the change is shared UI/CSS behavior. Existing quality
gates pass: lint, 128 tests, and production build.

Known gaps at completion: the dedicated Books destination, expanded mobile
navigation, and Create menu/sheet were planned for Milestone 2 and are now
resolved below. The in-app browser remained unavailable, so the signed-in
desktop and narrow-phone visual smoke test is still pending.

## Upgrade brief — Milestone 2: Navigation, Sidebar, Mobile Access, Favorites Shell

Status: Complete.

Files changed/added:
  `components/layout/navigation.ts`,
  `components/layout/{sidebar,mobile-nav,topbar,create-menu}.tsx`,
  `app/(app)/{layout,books,favorites,shared}/**`, the legacy
  `app/(app)/shared/collections/**` redirects, and the existing collection
  compatibility UI/API surfaces that now present user-facing Book language.

Delivered:
  - grouped desktop navigation with a stable logo in both expanded and
    collapsed modes, active-route states, and retained manual/hover behavior;
  - a phone-safe bottom navigation for Dashboard, Memories, Books, and Study,
    plus an accessible More sheet exposing Favorites, Reviewers, Quizzes,
    Diagrams, Shared with Me, Search, Notifications, Archive, and Settings;
  - a functional Create sheet linked to the existing Memory import, Book,
    reviewer, quiz, diagram, and connected-account workflows;
  - first-class `/books` and `/books/[id]` destinations backed by the legacy
    `ShareCollection` repository as an explicit compatibility boundary;
  - a grouped `/favorites` shell for the currently favoritable Memory,
    reviewer, and quiz models;
  - a single, uncluttered Shared with Me grid combining direct resource shares
    and legacy Book memberships, with type, owner, permission, and timestamp;
  - removal of visible Collections tabs/links and compatibility redirects from
    `/shared/collections/**` to `/books/**`;
  - user-facing Book terminology in sharing, public-link, notification,
    account-deletion, API error, and export filename surfaces.

Compatibility decision: no schema or destructive data migration was performed.
Legacy `ShareCollection*` models, `/api/collections` endpoints, export payload
format identifiers, and internal repository/component names remain intact until
Milestone 4 introduces the Book model and migration. Book favorites likewise
wait for that model; the Favorites destination is complete for resource types
that already persist favorite state.

Migrations added: none. Tests added: none; this milestone composes existing
data and behavior behind new navigation/UI surfaces. Verification passes:
ESLint with zero warnings, TypeScript `--noEmit`, all 128 tests across 20 files,
and the Next.js production build (including `/books`, `/books/[id]`, and
`/favorites`). Browser-based signed-in visual QA remains pending because no
in-app browser session was available and the configured database was not
reachable from this environment.

Next milestone: Milestone 3 — Dashboard & Authentication UI Redesign.

```
MILESTONE 1 — Audit
Status: Complete
Notes: Read markdown editor/renderer, AI prompts, import pipeline, both
exporters, Prisma schema, ai/providers.ts, guest mode structure,
validation folder, package.json. Findings in project-architecture.md /
content-system.md.

MILESTONE 2 — MMD Specification
Status: Draft complete (mmd-spec.md)
Notes: Block list, attributes, nesting, fallback behavior, versioning
policy written. Not yet reviewed/approved by Din. No code depends on it
yet, so it's still safe to change based on feedback.

PARSER FOUNDATION (part of Milestone 2/7, ahead of the numbered order
below since it's pure TS with zero new dependencies)
Status: Implemented, NOT test-verified locally
Files added:
  lib/mmd/ast.ts            — MmdNode/MmdBlockNode/MmdErrorNode types
  lib/mmd/spec-blocks.ts    — BLOCK_DEFS (single source of truth for
                               attrs + nesting policy per block)
  lib/mmd/parser.ts         — parseMmd(), collectMmdErrors(),
                               isPlainMarkdown()
  lib/mmd/index.ts          — barrel export
  tests/mmd-parser.test.ts  — vitest suite covering backward compat,
                               every block type, unterminated blocks,
                               depth limits, columns validation,
                               unknown blocks, attribute validation
IMPORTANT: could not run `npm install` / `npm test` in the sandbox this
was built in (no network access there). The two trickiest pieces of
control flow (an unterminated block not swallowing a later closed
sibling; depth-limit and columns-only-child validation) were manually
traced against a dependency-free reimplementation of the tokenizer and
confirmed correct — see conversation history — but the actual
`tests/mmd-parser.test.ts` file has NOT been executed. Run `npm test`
after pulling this in before trusting it.
RENDERER (Milestone 2, ahead of the numbered order — depends only on the
parser above, not on the editor/AI/diagram work)
Status: Implemented, NOT visually verified locally (no network in the
build sandbox to npm install/run Next.js dev server or Storybook).
Files added:
  components/mmd/renderer.tsx        — MmdRenderer (public entrypoint)
  components/mmd/node-list.tsx       — the ONE place block names map to
                                        components; unhandled block types
                                        fail safe via the default case
  components/mmd/inline-markdown.tsx — shared ReactMarkdown wrapper for
                                        Markdown text runs inside blocks
  components/mmd/blocks/*.tsx        — one file per block category
                                        (callouts, educational, layout,
                                        media, diagram placeholder,
                                        image-request placeholder, error)
`components/markdown/renderer.tsx` now just re-exports MmdRenderer under
its old name — every existing call site (note-detail, reviewer-detail,
guest flows, public collection viewer, editor preview pane) is
unchanged and needs no edits.
Deliberate scoping decisions:
  - `isPlainMarkdown()` fast path: any document with zero ":::" fences
    (100% of existing content today) renders through the exact original
    ReactMarkdown call, not through the MMD parser at all — existing
    Notes/Reviewers cannot regress from this change.
  - Images: no media/upload storage exists yet (confirmed in the audit),
    so `:::image`/`:::gallery` only resolve http(s) URLs; `media://`
    references render a clearly-labeled "not set up yet" placeholder,
    never a broken <img>.
  - Diagrams: no diagram storage/editor exists yet, so `:::diagram`
    always renders a labeled "not available yet" placeholder with the
    id/caption shown — never fakes a lookup.
  - `:::image-request`: renders as a distinct "pending" card with no
    interactive buttons (Generate/Upload/Replace/Remove are Milestone 6
    work — rendering inert buttons now would be its own fake affordance).
GAP FLAGGED: there is no component-rendering test infrastructure in this
repo yet — vitest is configured for `tests/**/*.test.ts` only, environment
`node`, no jsdom, no @testing-library/react dependency. Only
`lib/mmd/parser.ts` (pure logic) has tests. Adding React rendering tests
for components/mmd/* would need jsdom + @testing-library/react added as
new dev dependencies plus a vitest config change — flagging for Din
rather than silently adding new dependencies.
Next: editor insert menu (Milestone 4) is the next planned step, unless
redirected.

MILESTONE 3 — Diagram System
Status: Implemented for the focused v1 workflow: native SVG editor, CRUD/
duplicate APIs, connectors, undo/redo, persistence, and preview snapshots.
— see .context/diagram-system.md for the full reasoning on why these are
split across passes (short version: the editor needs a new npm dependency
this sandbox can't install/verify, everything below is either pure
TypeScript or a mechanical mirror of an existing working pattern).

Proceeded without an explicit answer to the four blocking decisions
previously raised, after several rounds of "continue" — used the
recommendations already documented in diagram-system.md. Flagging this
plainly: this includes a real Prisma schema change (new model + enum
value), not just new application code, and needs
`npx prisma migrate dev` run locally before anything touching diagrams
will actually work against a real database. Added to the existing
"Pending before deployment" list.

Files added:
  prisma/schema.prisma — new `Diagram` model (id/ownerId/title/data Json/
    schemaVersion/previewImage Bytes?/previewMimeType/timestamps),
    `ResourceType` enum gained `DIAGRAM` (so diagrams get the existing
    ResourceShare/ResourceInvite/PublicResourceLink sharing system for
    free), `User.diagrams Diagram[]` relation added.
  lib/diagrams/schema.ts — versioned Zod schema (DIAGRAM_SCHEMA_VERSION,
    diagramNodeSchema, diagramEdgeSchema, diagramDataSchema with a
    superRefine catching duplicate node ids and edges referencing
    nonexistent nodes), emptyDiagramData(), validateDiagramData(). Single
    source of truth for what a diagram's `data` JSON may contain — the
    eventual canvas editor must read/write through this, not trust
    whatever @xyflow/react's internal state shape looks like, so the
    persisted format stays independent of the library.
  lib/diagrams/repo.ts — createDiagram/updateDiagram/findDiagramById/
    findDiagramSummariesByOwner/duplicateDiagram/deleteDiagram/
    updateDiagramPreview/findDiagramPreview, mirroring lib/notes-repo.ts's
    hydrate-on-read pattern exactly (a row that fails schema validation on
    read falls back to an empty diagram rather than throwing — same
    fail-safe philosophy as the MMD parser).
  lib/validation/diagram.ts — createDiagramSchema/updateDiagramSchema,
    matching lib/validation/note.ts's shape.
  app/api/diagrams/route.ts (GET list, POST create),
  app/api/diagrams/[id]/route.ts (GET/PATCH/DELETE),
  app/api/diagrams/[id]/duplicate/route.ts (POST — ownership-restricted,
    matches the brief's "duplicate your own diagram" framing rather than
    becoming an unrequested "save a copy of a shared diagram" feature),
  app/api/diagrams/[id]/preview/route.ts (GET, serves the stored
    PNG/SVG snapshot) — all via withApiErrorHandling +
    canView/canEdit/isOwner, matching app/api/notes/[id]/route.ts's
    pattern line for line.
  tests/mmd-diagram-schema.test.ts — the "Diagram Schema" tests Milestone
    10 explicitly calls for and had been blocked pending this data layer:
    valid diagrams, invalid nodes, invalid edges, invalid properties,
    version validation, all the documented shape types.
Files changed:
  lib/permissions/index.ts — ownerLookup gained a DIAGRAM entry.
  components/mmd/blocks/diagram-block.tsx — now a client component that
    actually fetches /api/diagrams/:id and (if found) renders the stored
    preview image; falls back to the same "not found" placeholder as
    before for any id that doesn't resolve (which, until the editor
    exists, is every id — nothing creates rows yet). A 401 from guest
    mode resolves to the same "not found" state; no special-casing needed.

NOT built, and the recommended next step: the canvas editor itself
(shapes/connectors/drag/resize/select/undo/redo/toolbar/zoom/pan,
wrapping @xyflow/react — not yet an installed dependency). Recommend
building this only after Din confirms the data layer above actually
works (`npx prisma migrate dev`, then exercise the API routes directly)
— compounding an unverified new dependency on top of an unverified schema
change is worse than verifying them in sequence.

MILESTONE 4 — Editor Upgrade
Status: Insert menu implemented, NOT test-verified locally (same network
constraint as before — no npm install in the build sandbox)
Files added:
  components/mmd/editor/insert-menu.tsx — categorized dropdown (Media,
    Diagrams, Callouts, Educational, Layout, AI Workflow — groups pulled
    directly from BLOCK_DEFS[].category, not hand-duplicated)
  lib/mmd/editor-templates.ts — one insertion template per block type,
    deliberately kept separate from spec-blocks.ts (UI copy vs. parser
    schema) but sync-checked by getMissingTemplates()
  tests/mmd-editor-templates.test.ts — asserts every BLOCK_DEFS entry has
    a template and vice versa, every enabled template's default insertion
    parses with zero mmd-errors, and disabled templates aren't secretly
    unknown-block typos
Files changed:
  components/markdown/editor.tsx — added the Insert menu next to the
    existing toolbar (wired through the same applyEdit()/{block:true}
    pattern the Heading/List/Table buttons already use — no new editing
    mechanism introduced), and extended the formatting-guide panel with a
    short MMD section
Honesty calls carried over from the renderer:
  - Diagram menu item renders but is disabled ("The diagram editor isn't
    available yet.") — there's no diagram id space to reference yet, so
    inserting `:::diagram{id="..."}` with a made-up id would create a
    permanently broken reference.
  - Image/Gallery ARE enabled — they're genuinely usable today for
    external https:// URLs even without the media storage system.
  - "column" has a template (for the sync invariant) but no menu entry —
    it's only ever inserted as part of "columns".
Bug caught and fixed while wiring this up: lib/mmd/spec-blocks.ts's
`safeString()` helper had no minimum length, so a required attribute
written as `key=""` (present but empty) was passing validation as if it
were provided — e.g. the (disabled) diagram template's `id=""` would have
looked "valid." Fixed by defaulting `min: 1` on all string attributes;
optional attributes explicitly written as `title=""` now correctly get
dropped and fall back to the default label, same as if omitted.
GAP CARRIED OVER: still no component-rendering test infra (jsdom +
@testing-library/react not present) — the insert menu's actual DOM
behavior (click opens it, click-outside/Escape closes it, clicking an
item inserts the right text at cursor) is untested, only the
template-generation logic is. Same flag as the renderer milestone.
Not done yet: inline editor diagnostics for malformed MMD (Milestone 15 —
separate scope, the parser already produces the error data this would
need, nothing consumes it in the editor UI yet).

MILESTONE 5 — AI Content Generation Integration
Status: Complete and locally verified for note/reviewer workflows, including
prompt synchronization, clean outer-fence stripping, internal code-fence
preservation, ambiguous-commentary warnings, and MMD validation previews.
Files added:
  lib/mmd/ai-instructions.ts — buildMmdOutputRules(), generated from
    spec-blocks.ts (block list/attrs) + a small EXAMPLE_SYNTAX map (UI
    copy only) in the same file
  components/mmd/validation-notice.tsx — non-blocking "N blocks couldn't
    be parsed" notice
  tests/mmd-ai-instructions.test.ts
Files changed:
  lib/prompts/note-prompt.ts — buildNoteReformatPrompt() and
    buildSourcePackage() now embed buildMmdOutputRules() and require
    exactly one outer fence (previously explicitly forbade one)
  components/reviewers/reviewer-wizard.tsx,
  components/guest/guest-reviewer-flow.tsx — wired in the validation
    notice next to the existing preview
CORRECTION TO THE ORIGINAL AUDIT: lib/validation/reviewer.ts already had
a working stripCodeFences() wired into both reviewer creation flows —
missed in the Milestone 1 pass because it lives in lib/validation/, not
lib/imports/ where the audit was looking. Verified by hand that its
regex (anchored start+end) already correctly distinguishes an outer
wrapper fence from an inner fence that's genuinely part of the document
— the exact "outer fence contains an inner js fence" scenario from the
project brief — and is a safe no-op with no fence at all. This is why
the fence-flip (previously flagged to Din as a blocking/breaking-change
decision) shipped without waiting: reusing existing, already-correct
infrastructure instead of building lib/mmd/paste-import.ts from scratch
turned a "needs sign-off" item into a "just wire it up" item. See
.context/ai-content-generation.md for the full corrected writeup.
Real gap caught and fixed while writing tests/mmd-ai-instructions.test.ts:
initial version of that test tried to regex-scrape worked examples back
out of the rendered prose, which hit the exact same nested-":::" LIFO
ambiguity the parser exists to solve (the "columns" example's inner
":::column ... :::" close would be mistaken for the outer close).
Fixed by exporting the source EXAMPLE_SYNTAX map from ai-instructions.ts
and testing that directly instead of re-parsing prose — avoids building
a second, worse parser just for the test.
Completed follow-up: `analyzeReviewerImport()` now surfaces a dedicated
warning when commentary appears outside the response fence while preserving
the complete source text for user review.

MILESTONE 6 — Visual Asset Support (reframed)
Status: Complete without image-generation providers. User-owned SVG/raster
uploads and deterministic SVG templates are stored in Media and rendered
through `media://` URLs. Editable previews replace fulfilled image requests
with persistent image blocks. AI providers remain text-only.

MILESTONE 7 — Content Validation
Status: Substantially complete as a byproduct of the parser (Milestone 2)
— re-verified and documented in this pass rather than built fresh.
Every failure mode the brief lists is already handled: malformed custom
blocks, missing closing markers, unsupported attributes, unknown block
types, nested invalid structures all produce MmdErrorNode (never a crash,
never dropped content) — see lib/mmd/parser.ts and mmd-spec.md §7.
"Broken diagram references" is handled at render/export time rather than
parse time (a syntactically valid `:::diagram{id="x"}` isn't a parse
error even if `x` doesn't resolve) — currently every diagram reference
shows the same "not available yet" placeholder since the diagram store
doesn't exist yet (Milestone 3); once it does, this needs to become a
real "not found" vs. "not built yet" distinction, noted here so it isn't
forgotten. "Invalid image-request blocks" covered by the same required-
attribute validation as every other block (purpose/alt required).
Attribute validation itself (name/value/type/required allowlisting) uses
Zod schemas per block, matching the pattern already used in
lib/validation/*.ts elsewhere in this codebase.

MILESTONE 10 — Testing
Status: Parser, AI-import, export, and editor-template sync coverage in
place; component-rendering tests still blocked on a testing-infra decision
Test files (all added this project, NOT run locally — see the network
caveat repeated throughout this milestone log):
  tests/mmd-parser.test.ts — backward compat, every block type, malformed
    input, nesting depth, columns validation (Milestone 10's "Parser" list)
  tests/mmd-ai-import.test.ts — plain response, one outer fence, internal
    code blocks preserved, MMD content, malformed AI output, image-requests
    (Milestone 10's "AI Import" list, verbatim)
  tests/mmd-export-helpers.test.ts, tests/mmd-export-integration.test.ts —
    callouts, definitions, images, diagrams, cards, columns, collapsible
    content, malformed MMD (Milestone 10's "Export" list)
  tests/mmd-editor-templates.test.ts, tests/mmd-ai-instructions.test.ts —
    not in the brief's explicit list, added because they catch
    spec-blocks.ts drifting from the editor/AI prompt (already caught 2
    real bugs this session — see their respective milestone entries above)
NOT done — explicitly deferred, not silently skipped:
  "Renderer" tests (every block renders, unknown blocks fail safe in the
  UI, nested markdown works inside blocks) — this repo has no
  component-rendering test infrastructure (vitest is `node` environment,
  `tests/**/*.test.ts` only; no jsdom, no @testing-library/react). Adding
  either is a new-dev-dependency decision flagged to Din repeatedly since
  the renderer milestone and still not made.
  "Diagram Schema" tests — nothing to test yet, diagram system (Milestone
  3) hasn't been built; blocked on the same library/storage decisions.

MILESTONE 11 — Documentation
Status: .context/ files maintained continuously (this file, mmd-spec.md,
content-system.md, ai-content-generation.md, diagram-system.md,
project-architecture.md all updated as each piece landed). User-facing
guide: see Milestone 14 below — the two were done together since the
guide is generated FROM the same spec-blocks.ts this file describes.

MILESTONE 12 — Context-Aware Development
Status: Ongoing (this file exists specifically for it)

MILESTONE 13 — User AI Workflow
Status: Functionally complete for the note→reviewer path (Milestone 5
covers prompt generation through paste-back through parsing); no changes
needed to the actual copy/download UI, which already existed.

MILESTONE 14 — Editor Help / Quick Reference
Status: Complete for the note/reviewer editor.
Files added:
  components/mmd/editor/reference-guide.tsx — MmdReferenceGuide, listing
    every supported block (grouped by category), its description, and a
    copyable example — generated directly from BLOCK_DEFS
    (spec-blocks.ts) and the same EXAMPLE_SYNTAX map the AI prompt uses
    (ai-instructions.ts), so the guide can't describe syntax the parser
    doesn't actually support.
Files changed:
  components/markdown/editor.tsx — the existing inline quick-guide panel
    (already had a short hand-written MMD summary from Milestone 4) now
    has a "Show the complete Memoria Markdown reference" toggle that
    expands MmdReferenceGuide. Kept as a toggle rather than always-open
    so the default guide panel doesn't get overwhelming — 20 blocks with
    examples is a lot to scroll past for someone who just wants the
    plain-Markdown cheatsheet.

MILESTONE 9 — Export Support (PDF/DOCX)
Status: Implemented, NOT test-verified locally (same network constraint —
buildMarkdownPdf/buildMarkdownWord tests need jspdf/jspdf-autotable/docx
installed, which are already-declared dependencies, not new ones, but
still require `npm install` to actually run)
Files added:
  lib/mmd/export-helpers.ts — format-agnostic label/placeholder text
    shared by both exporters (e.g. "Definition: X", "[Diagram not
    available in export: id]"), so PDF and DOCX can't drift on wording
  tests/mmd-export-helpers.test.ts — includes a sync check that every
    BLOCK_DEFS entry either has a non-empty label or is one of the 7
    block types explicitly handled in both exporters' switch statements,
    so a future new block type can't silently render as nothing
  tests/mmd-export-integration.test.ts — exercises the real
    buildMarkdownPdf/buildMarkdownWord code paths against mixed
    plain-Markdown+MMD documents and malformed MMD, asserting no throw
Files changed:
  lib/pdf-export.ts, lib/word-export.ts — both rewritten from "scan raw
  Markdown lines with regex" to "parse once via parseMmd(), walk the
  resulting tree." This directly fixes the real bug flagged back in the
  Milestone 1 audit (content-system.md): both exporters previously had
  zero fence-awareness, so a ":::note" line would render as literal
  garbage text rather than being interpreted at all.
Design decisions carried through from earlier milestones, applied
identically in both exporters:
  - Plain-Markdown-only documents (100% of existing content) produce
    byte-identical output to the pre-MMD exporters — verified by hand
    that a document with zero ":::" fences always collapses to exactly
    the same function calls at indent/depth 0 as the original code did
    (see the reasoning trail in this session's history; not yet
    confirmed by an actual before/after diff of generated PDF/DOCX bytes,
    which needs the real libraries installed).
  - `:::columns` stacks sequentially rather than side-by-side — a real
    side-by-side layout has no faithful single-pass equivalent in either
    jsPDF's direct-draw model or docx's linear Paragraph flow; documented
    as an explicit v1 simplification, not an oversight.
  - `:::details` always renders expanded, labeled "(expandable in-app)" —
    matches the brief's explicit fallback instruction.
  - `:::image`/`:::gallery`/`:::diagram`/`:::image-request` all render as
    labeled text placeholders, NOT embedded images — see
    export-helpers.ts's doc comment for why (no media resolution exists
    in export context either; real image embedding is separately-scoped
    future work, not silently skipped).
  - Malformed MMD (mmd-error nodes) still prints its raw source text in
    the export rather than being dropped, per mmd-spec.md §7 — export
    must never lose content the in-app preview still shows.
Bug caught and fixed while writing this: the first draft of the
`:::columns` handling in both files used `.filter((c) => c.type ===
"block")` without a type predicate, which doesn't narrow the array
element type in TypeScript — `column.children` would have failed to
compile. Fixed by using the shared `isBlockNode` type guard from
lib/mmd/ast.ts in both files instead of two different inline predicates.
Also caught: the DOCX columns-separator paragraph used the string literal
`"single"` for a border style where the `docx` package's `BorderStyle`
enum is expected — fixed by importing and using `BorderStyle.SINGLE`.
Not done: real image/diagram byte embedding in exports (see above — a
separately-scoped async feature, not a gap in this pass's scope).

MILESTONE 8 — Import and Backward Compatibility
Status: Design invariant satisfied by construction (mmd-spec.md §8) and
re-confirmed this pass — a document with zero ":::" fences parses,
renders, and exports identically to before MMD existed (verified by hand
at every layer: parser, renderer, both exporters). No migration needed,
none was ever required.

MILESTONE 15 — Error Handling in the Editor
Status: Implemented for the main editor, NOT test-verified locally (no
component-rendering test infra, same flag as every UI milestone above)
Files changed:
  components/mmd/validation-notice.tsx — added a `className` prop (kept
    backward compatible: existing call sites with no className keep their
    original `mt-3` margin) and a per-error raw-text snippet
    (`truncateRaw`) so the user has some "approximate location" signal
    even without line numbers, which the parser doesn't track.
  components/markdown/editor.tsx — wired MmdValidationNotice into the
    main edit view (not just the paste-back wizards), debounced 400ms so
    typing doesn't re-parse the whole document on every keystroke (see
    mmd-spec.md's performance guidance).
Real limitation, not hidden: no line numbers. The raw-snippet approach is
a reasonable stand-in but is not the same as click-to-jump-to-error.
Upgrading this would mean threading line/column info through the parser
(lib/mmd/ast.ts's MmdErrorNode doesn't currently carry position data) —
a real, scoped follow-up, not done here.
Still not done: nothing here is truly "inline" (e.g. squiggly underlines
in the textarea at the exact offending text) — this is a below-the-editor
summary panel, which satisfies the brief's "identify the problem,
identify the approximate location, don't destroy content" requirements
but not a full inline-annotation experience. Judged sufficient for v1.

MILESTONE 16 — Final System Integration
Status: Implementation complete; environment smoke test pending. The individual pieces (parser → renderer → editor
→ AI prompt sync → export) have each been sanity-checked in isolation by
hand and via the test suites above, but the brief's specific end-to-end
workflows (create note → insert callout → insert diagram → save → reload
→ edit → export PDF → export DOCX; generate AI prompt → paste back →
render) have not been walked through as an integration pass — largely
because the diagram half of that workflow doesn't exist yet (Milestone 3
still blocked on Din's decisions) and the rest hasn't been run in a real
browser/Next.js dev server (no network in this build sandbox). This is
the natural next step once Din confirms the batch builds and the tests
pass locally.
```

## Decisions Din didn't respond to — proceeded with documented defaults
After several rounds of "continue" with no answer to these, proceeded

## Current verification addendum (2026-09-08)

The native SVG diagram editor, media upload/resolution path, diagram preview
generation, and final integration build are now implemented. `npm.cmd run
lint`, `npm.cmd test`, and `npm.cmd run build` pass locally; the suite is 20
files and 128 tests. The remaining release check is a signed-in browser
smoke test against a migrated, seeded database. AI image generation remains
intentionally provider-free; image requests use user uploads and deterministic
SVG templates instead.
using the recommendations already written in diagram-system.md /
ai-content-generation.md rather than continuing to block indefinitely.
Flagging plainly since two of these are real infrastructure, not just
application code:
1. Diagram library: proceeded with `@xyflow/react` as the recommendation
   — but it is NOT yet installed (no network in this sandbox to run
   `npm install` and verify it even resolves). The data layer (schema,
   repo, API routes) is built and doesn't depend on the library; the
   canvas editor that would actually need it is the one piece still not
   started — see Milestone 3 above.
2. Image/diagram export bytes storage: proceeded with Postgres `Bytes`
   (`Diagram.previewImage`) — this IS a real, applied schema change,
   needs `npx prisma migrate dev` before it works against a live DB.
3. AI image generation provider: NOT decided, NOT proceeded on — Milestone
   6 is still genuinely not started, unlike 1 and 2 above. The
   `:::image-request` placeholder path needed no provider decision and
   was already done back in Milestone 5.
4. Guest-mode diagram behavior: proceeded with "excluded" by default —
   diagrams are DB-backed rows requiring auth (every diagram API route
   calls `requireUserOrNull`), so guest mode simply can't reach them; no
   separate in-memory guest diagram store was built.

## Suggested build order — updated
1. `lib/mmd/spec-blocks.ts` + `lib/mmd/ast.ts` + `lib/mmd/parser.ts` — DONE.
2. `components/mmd/renderer.tsx` + block components — DONE.
3. Editor insert menu (Milestone 4) — DONE.
4. AI prompt sync (Milestone 5) — DONE.
5. Diagram data layer (Milestone 3, partial) — DONE; canvas editor NOT done.
6. Export updates (Milestone 9) — DONE.
7. Validation/tests/docs (7, 10, 11, 14, 15) — DONE.
8. The diagram canvas editor, media path, preview generation, and integration
   implementation are complete. AI image generation remains intentionally
   provider-free in v1; image requests use uploads, deterministic SVG
   templates, or saved diagrams. The only remaining check is the signed-in
   browser/dev-server smoke test against a reachable database.
