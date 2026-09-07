# Memoria — Existing Project Upgrade Context

> **Purpose:** Drop this file into the existing Memoria repository (recommended path: `.context/memoria-ui-books-mmd-upgrade.md`) and give it to ChatGPT/Claude/Codex before making changes.
>
> **Project type:** Existing production-style Next.js application. **Do not rebuild or reset the project.** Extend and migrate the current architecture safely.
>
> **Priority:** UI/UX quality, mobile usability, MMD authoring/editing, Books, movable diagrams/SVG content, reliable imports/exports, and preserving all existing study functionality.

---

## 1. Mandatory Working Rules

Before writing code:

1. Read **all existing files in `.context/`** first.
2. Inspect the current implementation before assuming a feature is missing.
3. Determine which existing milestone/state is actually implemented.
4. Treat this document as a **newer product direction** that overrides conflicting older context.
5. Do **not** delete or rewrite working features just to simplify implementation.
6. Do **not** reset the database or discard user data.
7. Any schema changes require a safe Prisma migration and a compatibility plan.
8. Any rename/removal that affects routes, permissions, sharing, exports, search, revisions, notifications, or public links must be traced through the entire codebase.
9. Preserve Review Mode, Exam Mode, quizzes, reviewers, flashcards/study behavior, sharing, revisions, tags, search, imports, exports, auth, integrations, and permissions unless this document explicitly changes them.
10. Run the repository's existing quality gates after each milestone where feasible:
    - `npm run lint`
    - `npm run test`
    - `npm run build`
11. Add targeted tests for every new parser/schema/permission/export behavior.
12. Do not leave fake buttons, dead actions, placeholder controls, or UI that appears interactive but does nothing.
13. Any generated/updated context must stay synchronized with code. When implementation changes a documented contract, update the relevant `.context` file in the same milestone.

### Existing architecture discovered in this repository

This is not a greenfield design. The current project already contains, among other things:

- `components/mmd/*` and `lib/mmd/*` for Memoria Markdown parsing/rendering/editor helpers.
- `components/diagrams/diagram-editor.tsx` plus `lib/diagrams/*` and diagram API routes.
- `lib/pdf-export.ts`, `lib/word-export.ts`, and resource-specific export routes.
- `components/layout/sidebar.tsx`, `mobile-nav.tsx`, and `topbar.tsx`.
- Notes, Reviewers, Quizzes, Study/Review modes, Sharing, Notifications, Revisions, Search, Integrations, Media, and Permissions.
- Current **Collections** implementation in routes/components/database and sharing.
- Current file import pipeline supports `.txt`, `.md`, `.pdf`, `.docx`, and `.json`; **PPTX is not currently in the supported extension list and must be added**.
- Current `ResourceType` includes `NOTE`, `REVIEWER`, `QUIZ`, and `DIAGRAM`.

Because of this, all work below must adapt existing code rather than duplicate systems.

---

# 2. Product Direction

Memoria should feel like a distinctive, crafted learning and memory workspace rather than a generic AI dashboard.

The product identity should combine:

- high-quality reading experience,
- personal knowledge organization,
- powerful but approachable editing,
- visual learning through diagrams/SVG,
- structured Books made of Memories,
- study/review/exam functionality,
- reliable document import/export,
- excellent mobile navigation,
- restrained but expressive interaction design.

The interface must not look like a default AI-generated SaaS template with repetitive rounded cards, oversized gradients everywhere, random glassmorphism, or dashboards stuffed with vanity numbers.

**Design goal:** recognizable as Memoria even if the logo is hidden.

---

# 3. UI / UX Design System — HIGH PRIORITY

This is a major weakness in the current application and should be treated as core product work.

## 3.1 Visual direction

Build a coherent visual language with:

- intentional typography hierarchy,
- strong reading rhythm,
- refined spacing scale,
- visual depth without excessive shadows,
- purposeful motion,
- contextual color,
- distinctive surfaces for Memories, Books, tools, diagrams, quizzes, and study states,
- subtle gradients where they add meaning rather than decoration,
- hover/focus/pressed states,
- polished empty/loading/error states,
- responsive layouts designed for mobile rather than desktop layouts merely squeezed smaller.

Avoid visual noise. Information should be progressively disclosed.

## 3.2 Typography

Typography must become configurable and expressive inside MMD and the editor.

Support a safe, bounded typography system such as:

- text style/preset,
- font size scale,
- weight,
- line height,
- letter spacing,
- alignment,
- emphasis,
- text color using validated theme tokens,
- optional gradient text using validated presets,
- muted/accent/strong semantic treatments,
- controlled decorative styles for titles or hero text.

Do not allow arbitrary executable CSS or unsafe HTML attributes.

The editor must expose these options visually where appropriate.

## 3.3 Motion and interaction

Add motion with restraint:

- page/section transitions,
- expandable tool drawers,
- sidebar transitions,
- card/list entrance where useful,
- hover feedback,
- drag/drop feedback,
- diagram transform handles,
- modal/sheet transitions,
- TOC active-state transitions,
- success/error feedback.

Animations must never block input, cause layout jumps, or make the app feel slow.
Respect reduced-motion preferences.

## 3.4 Dashboard redesign

The dashboard is currently too basic and should be redesigned.

Do **not** overwhelm the user with too many metrics or cards.

The dashboard should prioritize:

1. **Continue where you left off** — most relevant recent Memory/Book/study activity.
2. A clean **Create** action.
3. Recent Memories and/or Books.
4. Relevant study continuation (quiz/review) only when useful.
5. Small, meaningful progress indicators—not a wall of statistics.
6. Favorites or recently accessed resources where helpful.

Use visual hierarchy so one or two actions dominate, not twelve equal cards.

### Create control

The top-right **Create** button must open a clear menu/sheet with creation choices such as:

- Create Memory / Note
- Import Note
- Create Book
- Create Quiz (if direct creation remains supported)
- Create Diagram
- Connected Apps

For the note creation/import flow:

- label the action clearly as **Create Note** or **Create Memory** according to the final product naming decision,
- remove the old standalone link input from the main create-note UI,
- external imports should live under **Connected Apps** or **Import Note**, not clutter the default form.

## 3.5 Tool drawer inside a Memory

Opening a Memory currently exposes too many buttons.

Replace the overwhelming action row with:

- a few high-frequency primary actions kept visible,
- a collapsible **Tools** drawer/menu/sheet for secondary actions.

Suggested visible actions:

- Edit
- Study / Review
- Favorite

Suggested tools drawer contents:

- Export
- Share
- Regenerate / Reprompt
- Revision history
- Tags / metadata
- Duplicate
- Move/Add to Book
- Delete
- other infrequent utilities

Exact grouping may change based on existing functionality, but the guiding rule is **progressive disclosure**.

## 3.6 Notifications redesign

Improve notification presentation:

- clear unread/read hierarchy,
- useful grouping when appropriate,
- compact preview,
- timestamps,
- meaningful icons based on event type,
- sensible empty state,
- no huge intrusive panels,
- mobile-friendly sheet/popover,
- keyboard accessible.

Do not use notification UI to advertise normal actions.

## 3.7 Login / auth UI

Improve login/register/verification interfaces so they feel part of Memoria, not default forms.

Requirements:

- strong brand presence,
- clean validation,
- password affordances,
- useful error states,
- mobile-first layout,
- no decorative overload,
- preserve current authentication behavior.

## 3.8 Sidebar behavior

When sidebar is collapsed:

- do **not** move the logo beside the search bar,
- keep the Memoria logo/brand at the top area of the sidebar,
- use the currently blank top space intelligently,
- refine collapse/expand animations,
- avoid content jumping.

## 3.9 Mobile navigation — NON-NEGOTIABLE

Every main product area must remain reachable on mobile, including:

- Dashboard
- Memories/Notes
- Books
- Favorites
- Shared with Me
- Study / Review / Quiz areas as applicable
- Diagrams
- Search
- Notifications
- Settings

Do not hide core destinations simply because the desktop sidebar is unavailable.
Use a bottom navigation + More sheet, drawer, or another deliberate mobile navigation pattern.

### Hard mobile layout invariant

**No page-level horizontal scrolling.**

No interactive element, table, diagram shell, modal, toolbar, card, editor, image, or custom MMD block may force the viewport wider than the phone screen.

Use:

- `min-width: 0` correctly in flex/grid children,
- responsive wrapping,
- truncation where appropriate,
- internal scrollers only when semantically necessary,
- stacked mobile layouts,
- responsive drawers/sheets,
- bounded media,
- adaptive toolbar menus.

Do not “solve” desktop tables by letting the whole webpage scroll sideways.

## 3.10 Responsive tables

Tables must be usable on phones without breaking the entire UI.

Implement an adaptive approach depending on table complexity:

- simple tables: stacked rows/cards or label-value views,
- wider data tables: a **contained** table viewport with clear horizontal navigation/scroll affordance inside its own boundary only,
- optionally freeze first column where useful,
- provide a compact/expanded table mode if needed,
- never let a table enlarge the page viewport.

MMD tables must follow the same rule.

---

# 4. Navigation & Information Architecture

## 4.1 Remove Collections

**Collections are removed from the product.**

Do not merely hide the tab.

Audit and safely remove/replace:

- Collections navigation,
- `/shared/collections` UI,
- collection components,
- collection-specific public/published behavior,
- collection membership logic,
- collection links inside share dialogs,
- collection search/indexing if present,
- collection feedback relationships,
- collection routes/API/repositories,
- database models only after a safe migration strategy is ready.

Current repository references include `ShareCollection`, `ShareCollectionMember`, `ShareCollectionItem`, collection pages/components, and collection-linked feedback. Handle these explicitly.

### Migration rule

If existing users can already have Collections, do not drop them destructively.
Create a migration path to **Books** or preserve them temporarily behind an internal compatibility layer until migrated.

## 4.2 Books — new first-class tab

Create a dedicated **Books** tab separate from Memories.

A Book is an ordered, curated collection of Memories intended to be read/studied as a cohesive work.

Books are **not publishing**.

A Book should support:

- title,
- optional subtitle,
- optional description,
- cover style/cover media where supported,
- owner,
- ordered Memories,
- custom table-of-contents title,
- sharing settings,
- permissions,
- last-read state,
- timestamps,
- optional theme/presentation settings if they can be implemented cleanly.

### Book table of contents

Before the Memory content, every Book must have a Table of Contents.

Requirements:

- clear numbering/ordering,
- Memory titles,
- optional section grouping if later supported,
- click/tap navigation,
- active/current item state,
- responsive mobile presentation,
- user-editable TOC heading (e.g. "Contents", "Inside this Book", "Chapters").

## 4.3 Continue where you left off

Track last-seen/read position for Books and relevant Memories.

A Book should be able to show:

- last Memory opened,
- optionally an anchor/block/scroll position when practical,
- last accessed timestamp,
- **Continue reading** action.

Do not store scroll updates excessively; debounce or use meaningful checkpoints.

## 4.4 Favorites

Add a dedicated **Favorites** tab.

Allow users to favorite useful resource types, at minimum Memories and Books. If the existing architecture makes it clean, support reviewers/quizzes/diagrams as well through a polymorphic favorite model.

Favorite state should be available from list cards and detail views.

## 4.5 Shared with Me

**Shared with Me stays one straightforward destination.**

Do not add a switch back to Collections; Collections no longer exist.

Shared with Me should list resources users can access, including shared Books, and clearly identify:

- resource type,
- owner,
- VIEW or EDIT access,
- last updated,
- useful direct action.

Keep it uncluttered.

---

# 5. Books Sharing & Permissions

Books can be shared without being “published.”

Support two sharing methods:

1. **Private sharing** — invite specific user/email.
2. **Anyone with the link** — unguessable, revocable link.

For either method, where appropriate, allow permission selection:

- VIEW
- EDIT

Do not label this publishing.

Requirements:

- owner always retains owner permissions,
- editor cannot change ownership unless explicitly supported,
- link can be revoked/rotated,
- permission can be changed later,
- shared users cannot exceed granted permissions,
- Books sharing must not accidentally grant direct access to unrelated private resources,
- decide and document whether Book access grants access to contained Memories through the Book only or grants resource-level access; implement one consistent rule.

Recommended model: Book permission allows rendering/editing Book structure and contained Memories in the Book context. Direct independent Memory permissions should remain explicit unless the user already owns the Memory.

---

# 6. Feedback Authorization Fix

There is a permissions bug/undesired behavior around deleting feedback.

Rule:

- A normal user may delete **their own feedback only**.
- Resource owners/editors should not silently impersonate feedback authors.
- If moderation deletion by an owner is deliberately supported, it must be a distinct **moderation** action with explicit UI/authorization—not treated as “delete your own comment.”

Audit the current `app/api/feedback/[id]/route.ts` behavior and all feedback relationships, especially because existing feedback is tied to Collections that are being removed.

Add authorization tests.

---

# 7. Memory Presentation Redesign

Memories currently feel too simplistic. Redesign both list and detail views.

## Memory list/grid

Provide purposeful display variants with:

- strong title hierarchy,
- concise content preview,
- content type/metadata only where useful,
- visual cue for images/diagrams,
- favorite state,
- Book membership where useful,
- recent activity,
- clean hover/focus states,
- responsive grid/list behavior.

Avoid identical generic cards for every content type.

## Memory reader

The reader should feel editorial and polished:

- excellent width/line length,
- typography hierarchy,
- high-quality image treatment,
- captions,
- responsive callouts,
- elegant sections/cards,
- readable tables,
- diagram integration,
- column layouts that gracefully collapse on mobile,
- tools hidden until needed,
- scroll position restoration where appropriate.

Images should never feel like raw `<img>` tags dropped into Markdown.

---

# 8. Memoria Markdown (MMD) vNext

The current MMD spec is deliberately limited. This upgrade expands it while preserving safety and deterministic parsing.

## 8.1 Dedicated Memoria Markdown editor

Create a real editor **specific to MMD**.

Do not leave users editing a raw textarea plus a small insert menu as the primary experience.

The editor should support:

- source editing,
- live preview,
- syntax-aware MMD blocks,
- block insertion,
- block selection,
- block reorder/move controls,
- properties/inspector panel,
- typography controls,
- layout controls,
- image/media controls,
- diagram/SVG insertion,
- validation diagnostics,
- syntax/reference help,
- undo/redo,
- keyboard shortcuts where appropriate,
- responsive mobile editor mode.

A split source/preview mode may remain available, but the product should also provide a structured authoring workflow that makes MMD understandable without memorizing syntax.

### Editor architecture principle

Do not fork document semantics between visual mode and source mode.
Both must round-trip through the same MMD AST/spec.

## 8.2 Expand MMD styling properties

Add safe, schema-backed visual properties to supported blocks/text containers.

Possible property families:

- `variant`
- `tone`
- `align`
- `size`
- `width`
- `padding`
- `radius`
- `border`
- `shadow`
- `background`
- `gradient`
- `textStyle`
- `textColor`
- `fontSize`
- `fontWeight`
- `lineHeight`
- `letterSpacing`
- `hover`
- `animation`

These must use closed enums/presets/theme tokens. **No arbitrary CSS strings.**

Not every property belongs on every block. Define an allowlist per block in the MMD spec/schema.

Animations/hover effects should degrade cleanly in PDF/DOCX exports.

## 8.3 Columns must support multiple column tags

`:::columns` must correctly accept **multiple `:::column` children** and render them reliably.

Do not accidentally parse only one child or collapse sibling columns.

Support a practical number of columns with responsive behavior. Desktop can honor multiple columns; mobile should stack/reflow without overflow.

If column width ratios are introduced, use validated bounded values/presets and include export fallbacks.

Add parser/render/export tests for 2, 3, and multiple valid column children plus invalid nesting.

## 8.4 Table cell line breaks

AI-generated MMD frequently puts `<br>` inside Markdown table cells, but the current rendering does not reliably create line breaks.

Fix this at the **content grammar/rendering level**, not by enabling arbitrary raw HTML.

Preferred safe approaches:

- recognize a controlled `<br>` / `<br/>` token specifically inside Markdown table cell text and convert it to a safe line-break node, **or**
- define a canonical MMD-safe table line-break syntax and normalize common AI output to it during parsing.

Do not globally enable `rehype-raw`/arbitrary HTML simply to support `<br>`.

The AI generation instructions must document the canonical table newline behavior.

## 8.5 No AI image-request block in prompt generation

Stop prompting external AI to return image-generation requests.

Deprecate/remove `:::image-request` from **AI prompt generation**.
Existing documents containing it should continue to render safely for backward compatibility until migrated.

---

# 9. SVG / HTML Visual Asset Workflow

Instead of asking AI to generate images or separate diagram requests, generated prompts should request a **self-contained HTML/SVG visual snippet/file** when a visual is useful.

Examples include:

- educational diagrams,
- flowcharts,
- simple illustrations,
- icons/logos,
- labeled systems,
- timelines,
- visual summaries.

## 9.1 Prompt rule

AI generation prompts should say, in substance:

- Do not return requests asking another system to generate an image.
- When a visual is useful, produce SVG markup wrapped in the Memoria-supported visual format.
- Prefer pure SVG primitives and text.
- Avoid JavaScript.
- Avoid external scripts, iframes, forms, event handlers, remote CSS, and unsafe HTML.

## 9.2 Security rule

Do **not** execute arbitrary AI HTML.

Create a strict sanitizer/parser pipeline:

- allow a small safe SVG element/attribute allowlist,
- strip scripts and event handlers,
- reject `javascript:` URLs,
- restrict external references,
- reject foreignObject unless explicitly proven safe and necessary,
- sanitize IDs/references,
- enforce size/complexity limits to prevent pathological payloads.

Prefer storing normalized SVG rather than a full arbitrary HTML document.

## 9.3 MMD embedding

Add or evolve a block such as:

```mmd
:::svg{title="..." caption="..."}
<sanitized SVG source or a reference to stored sanitized SVG>
:::
```

However, because the existing MMD spec currently forbids raw HTML, choose one explicit architecture and document it:

**Recommended:** store SVG as a separate visual/media resource and have MMD reference it by ID, similar to diagrams. Example:

```mmd
:::visual{id="..." caption="..."}
:::
```

This keeps raw generated markup out of ordinary MMD content while still allowing the system to import, sanitize, render, edit, and export SVG.

---

# 10. Diagram System Redesign

The existing diagram editor/UI needs a significant usability and visual upgrade.

## 10.1 Everything on the diagram canvas is movable

Objects must be interactively movable while editing.

At minimum support:

- select,
- drag/move,
- resize,
- multi-select where practical,
- duplicate,
- delete,
- bring forward/send backward or equivalent z-order,
- connectors/edges,
- editable labels/text,
- zoom,
- pan,
- undo/redo,
- keyboard nudging where practical,
- alignment/snap guides if feasible.

## 10.2 Canvas boundaries must adapt

The working area must not behave like a rigid box that clips content.

If an object is moved beyond the current visible bounds:

- dynamically expand the logical canvas/workspace, or
- use an effectively infinite canvas model.

The user must be able to resize or reframe diagrams based on actual object extents.

Provide a reliable **Fit to content** action.

Exported SVG/preview bounds should derive from content bounds plus safe padding, not a hardcoded viewport that cuts objects off.

## 10.3 Better diagram UI

Redesign the editor chrome:

- compact contextual toolbar,
- obvious selection state,
- property inspector for the selected object,
- shape palette/insert menu,
- clean connector controls,
- visible zoom controls,
- fit-to-content,
- undo/redo,
- no giant permanent toolbar wall,
- responsive layout.

On mobile, use sheets/drawers and touch-friendly handles.

## 10.4 Diagram insertion into Memories must work

Fix the currently broken append/insert diagram workflow end-to-end:

1. create/open diagram,
2. save/persist diagram,
3. insert reference into Memory MMD,
4. render latest diagram in reader,
5. edit diagram and see updated rendering,
6. export diagram correctly in PDF/DOCX/book export.

Add an integration test or at least targeted API/parser/export tests covering diagram references.

## 10.5 SVG visuals vs. native diagrams

Treat these as related but distinct:

- **Native Diagram:** editable object graph with shapes/connectors and movable nodes.
- **SVG Visual:** sanitized SVG imported/generated as visual content.

If feasible, allow SVG visual layers/elements to be transformed on a diagram canvas. Do not fake element-level editing if the imported SVG cannot support it; in that case make the SVG itself a movable/resizable object.

---

# 11. AI Prompt Generation Changes

Every generated prompt intended for another AI must:

1. Require output inside a fenced code snippet for easy copy/paste.
2. Specify the expected file/content type clearly.
3. Follow the current Memoria MMD specification.
4. Avoid asking for image generation.
5. Avoid asking for separate diagram-generation requests.
6. When visuals are beneficial, instruct the AI to output safe SVG-based visual content according to the Memoria visual contract.
7. Avoid unsupported raw HTML outside the SVG visual contract.
8. Use the canonical table line-break syntax.
9. Use multiple `column` blocks correctly where requested.
10. Avoid hallucinating MMD attributes that are not in the spec.

Update all prompt builders, including authenticated and guest flows.

The fenced output requirement should be explicit, for example:

> Return the complete final Memoria content inside exactly one fenced code block so the user can copy and paste it directly. Do not put explanations outside the code block.

Do not accidentally include nested triple-backtick conflicts; choose a safe fence strategy when the generated content itself may contain code fences.

---

# 12. Regenerate / Reprompt a Memory

Inside each Memory, add **Regenerate / Reprompt**.

The user should be able to:

- use the existing Memory as source/context,
- choose or edit the generation instruction,
- optionally choose processing style,
- preview the new result,
- replace the current Memory only after explicit action,
- or save as a new Memory.

Preserve revision history before replacement.
Do not silently overwrite user edits.

---

# 13. Import System Upgrade

## 13.1 Add PPTX import

Add `.pptx` to supported imports.

Extract useful content including, where technically reasonable:

- slide titles,
- text boxes,
- bullet hierarchy,
- speaker notes if safely available,
- slide ordering.

Convert to clean structured source text/MMD suitable for Memory creation.

If images/diagrams cannot be faithfully imported, report that clearly rather than silently losing them.

Do not execute macros or embedded active content.

Add MIME/magic-byte validation similar to existing PDF/DOCX checks.

## 13.2 Existing imports remain supported

Do not regress `.txt`, `.md`, `.pdf`, `.docx`, `.json`, connected Google/Notion sources, or guest extraction.

---

# 14. Export System — Reliability First

**Exporting PDF should work consistently. Exporting all supported document formats should work consistently.**

Treat export failures as product bugs, not edge cases.

## 14.1 PDF must replicate rendered MMD, not raw Markdown

When exporting Notes/Memories to PDF:

- do not print Markdown syntax (`#`, `**`, raw fences, etc.),
- parse MMD through the same logical document model,
- replicate the reading-view structure as closely as the target format allows,
- preserve headings, typography hierarchy, spacing, callouts, tables, columns, images, captions, diagrams/SVG visuals, lists, code, and sections,
- provide documented fallbacks for hover/animation/interactive-only features,
- never silently omit valid content.

The export should be content-faithful, even if pixel-perfect browser rendering is not possible.

## 14.2 Memory PDF cover page

Instead of placing a repetitive Memoria header on every page, create a dedicated **single first-page cover**.

Suggested template:

### Memoria Memory Cover

- generous whitespace,
- small Memoria mark/name,
- Memory title as the dominant element,
- optional subtitle/description,
- optional source/subject/tag line,
- author/owner display name when appropriate,
- generated/exported date,
- subtle visual motif derived from the Memory/Book theme,
- optional small cover visual if available,
- no cluttered app chrome.

Page 2 begins the actual content.

Do not repeat “Memoria” as a large header on every content page.

## 14.3 Book export

Books must be exportable.

A Book PDF should have its own template:

### Memoria Book Export Template

**Page 1 — Book cover**
- Memoria mark/name (subtle)
- Book title
- subtitle if present
- description/author if present
- optional cover visual
- export date

**Page 2 — Table of Contents**
- use the Book's custom TOC title
- list ordered Memories/chapters
- include page numbers if the export engine can resolve them reliably

**Following pages**
- each Memory becomes a chapter/section,
- clear chapter opening treatment,
- consistent typography,
- preserve MMD content structure,
- avoid duplicate app UI headers.

## 14.4 DOCX and other exports

Keep export semantics aligned across supported formats.

Interactive features should have intentional static fallbacks.

Examples:

- hover → base state,
- animation → final/resting state,
- details/collapse → expanded,
- interactive diagram → rendered SVG/image plus caption,
- responsive columns → stable page-appropriate column or stacked layout.

Add regression tests for representative MMD blocks.

---

# 15. Books Data Model Guidance

Do not blindly rename `ShareCollection` to Book because Books have broader responsibilities.

Recommended domain concepts:

- `Book`
- `BookItem` or `BookMemory`
- `BookProgress` / `BookReadingState`
- sharing through existing generalized permission tables where possible
- `Favorite`

Suggested `Book` fields:

- `id`
- `ownerId`
- `title`
- `subtitle?`
- `description?`
- `tocTitle`
- `coverMediaId?`
- `theme?` (bounded JSON/schema or enum, optional)
- `createdAt`
- `updatedAt`

Suggested Book item fields:

- `bookId`
- `noteId` / memory resource id
- `position`
- optional custom chapter title if desired later

Book ordering must be transaction-safe and deterministic.

Add `BOOK` to the resource/permission type system if using current polymorphic sharing.

Migration must consider legacy Collections and feedback before dropping old tables.

---

# 16. Naming: Memory vs Note

The UI language should emphasize **Memories** because that is central to the product concept.

However, the existing implementation is heavily built around `Note` internally.

Do not perform a risky full internal rename just for aesthetics.

Recommended approach:

- user-facing label: **Memory / Memories**,
- internal model may remain `Note` initially,
- document this mapping clearly,
- only perform an internal model rename in a dedicated migration milestone if it provides real architectural value.

Consistency matters more than renaming every symbol.

---

# 17. Accessibility & Usability Baseline

All upgraded UI must include:

- keyboard navigation,
- visible focus states,
- semantic controls,
- ARIA labels where icons lack visible labels,
- accessible dialogs/sheets,
- contrast checks,
- image/SVG accessible titles/descriptions where meaningful,
- sufficiently large touch targets,
- reduced motion support,
- no color-only state communication.

---

# 18. Performance Guardrails

Do not sacrifice usability with excessive animation or huge client bundles.

- lazy-load heavy editors when possible,
- avoid rerendering entire MMD documents for tiny property edits when avoidable,
- debounce autosave,
- debounce last-read progress,
- virtualize very large lists only if needed,
- sanitize SVG server-side or in a trusted boundary,
- cache rendered/export-safe diagram previews appropriately,
- do not store giant inline base64 blobs in MMD.

---

# 19. Milestone Plan

Use these milestones for progress tracking. Update `.context/milestones.md` after each milestone with:

- status,
- files changed,
- migrations added,
- tests added,
- known gaps,
- next milestone.

Do not mark a milestone complete if its main user flow is still fake or broken.

## MILESTONE 0 — Full Regression & Dependency Audit

**Goal:** understand the current app before changing behavior.

Tasks:

- read all `.context` files,
- run/inspect lint, tests, build,
- map Collections dependencies,
- map Note/Memory detail actions,
- map diagram insert/render/export flow,
- map MMD parser/editor/export behavior,
- map mobile navigation,
- map sharing/permissions/feedback,
- map import/export formats,
- document migration risks.

**Exit criteria:** clear implementation map and no assumptions based only on old context text.

---

## MILESTONE 1 — Design System & Responsive Foundation

**Goal:** fix the visual/UI foundation before layering more features.

Tasks:

- define typography tokens,
- spacing/surface/radius/elevation system,
- motion tokens,
- responsive breakpoints/layout primitives,
- eliminate page-level horizontal overflow,
- improve reusable buttons/cards/inputs/dialogs/sheets/empty/loading states,
- create responsive table container/component,
- establish Memory/Book visual identity.

**Exit criteria:** core UI primitives are consistent and phone-safe.

---

## MILESTONE 2 — Navigation, Sidebar, Mobile Access, Favorites Shell

**Goal:** every important destination is reachable and understandable.

Tasks:

- redesign desktop sidebar,
- fix collapsed logo placement,
- improve topbar/Create control,
- redesign mobile navigation,
- add Books destination,
- add Favorites destination,
- simplify Shared with Me navigation,
- remove Collections tabs/links from visible UI while migration work continues internally.

**Exit criteria:** all core destinations accessible on desktop and mobile with no hidden dead ends.

---

## MILESTONE 3 — Dashboard & Authentication UI Redesign

**Goal:** make the first-use and returning-user experience distinctive and uncluttered.

Tasks:

- redesign dashboard,
- add Continue where you left off card,
- recent Memories/Books,
- Create menu,
- meaningful study continuation,
- improve login/register/verification UI,
- refine loading/empty/error animation states.

**Exit criteria:** dashboard is useful without information overload and auth visually matches the product.

---

## MILESTONE 4 — Books Data Model & Collections Migration

**Goal:** replace Collections correctly, not cosmetically.

Tasks:

- create Book/BookItem/BookProgress models,
- add BOOK permission type if required,
- design legacy collection migration,
- migrate eligible collection content into Books,
- decide feedback migration/archival behavior,
- create Books APIs/repositories/validation,
- only then retire obsolete collection persistence/routes.

**Exit criteria:** no data loss, Books persist correctly, Collections are no longer a product concept.

---

## MILESTONE 5 — Books UX, TOC, Reading Progress & Sharing

**Goal:** Books become a polished first-class experience.

Tasks:

- Books list,
- Book create/edit,
- add/reorder/remove Memories,
- custom TOC title,
- TOC navigation,
- continue reading / last seen,
- VIEW/EDIT private sharing,
- VIEW/EDIT anyone-with-link sharing,
- Shared with Me integration,
- mobile Book reader.

**Exit criteria:** a user can create, organize, read, resume, share, and collaboratively edit a Book according to permission.

---

## MILESTONE 6 — Favorites & Memory Presentation Redesign

**Goal:** make Memories and saved content pleasant to browse/read.

Tasks:

- implement Favorites model/API/UI,
- redesign Memory cards/list,
- redesign Memory reader typography/media,
- add Book membership actions,
- move secondary actions into Tools,
- ensure responsive MMD tables/columns/media.

**Exit criteria:** Memories look crafted, not generic; Favorites work across chosen resource types.

---

## MILESTONE 7 — MMD vNext Specification & Parser

**Goal:** define the expanded authoring/rendering contract before editor work.

Tasks:

- update MMD spec,
- add typography/style presets,
- define safe visual/SVG resource block,
- define canonical table newline behavior,
- validate multiple column children,
- deprecate image-request from generation prompts,
- update AST/parser/schema tests,
- maintain backward compatibility.

**Exit criteria:** parser/schema tests cover all new syntax and old MMD still renders.

---

## MILESTONE 8 — Dedicated Memoria MMD Editor

**Goal:** users can author MMD without fighting raw syntax.

Tasks:

- structured block editing,
- block insert/reorder/delete,
- properties panel,
- typography controls,
- layout controls,
- validation diagnostics,
- source + preview modes,
- undo/redo,
- media/diagram/visual insertion,
- mobile editor workflow,
- round-trip AST/source safety.

**Exit criteria:** a user can create and edit every supported MMD feature through Memoria-specific tooling.

---

## MILESTONE 9 — Diagram Editor v2 & Reliable Memory Insertion

**Goal:** diagrams become truly editable visual objects.

Tasks:

- movable/resizable objects,
- adaptive/infinite canvas,
- fit-to-content,
- z-order,
- connectors,
- contextual inspector,
- improved styling,
- responsive mobile tools,
- fix append/insert-to-Memory pipeline,
- update snapshots after edits.

**Exit criteria:** no object gets clipped by rigid bounds and inserted diagrams always render in Memories.

---

## MILESTONE 10 — Safe SVG Visual Pipeline & AI Prompt Rewrite

**Goal:** replace AI image/diagram requests with a renderable safe visual contract.

Tasks:

- implement sanitized SVG storage/import,
- safe renderer,
- MMD visual reference block,
- visual preview/editor affordances,
- rewrite all AI prompt builders,
- enforce single copy/paste code fence output,
- update guest prompts,
- add security tests for malicious SVG/HTML.

**Exit criteria:** AI can generate copy-pasteable content with SVG visuals and Memoria can safely render them without executing arbitrary HTML.

---

## MILESTONE 11 — Regenerate / Reprompt Memory

**Goal:** let users rework AI-generated Memories without losing control.

Tasks:

- reprompt UI,
- editable instruction,
- generation preview,
- replace vs save as new,
- revision snapshot before replacement,
- error/retry behavior.

**Exit criteria:** regeneration cannot silently destroy existing content.

---

## MILESTONE 12 — PPTX Import & Import UX Cleanup

**Goal:** broaden import while simplifying creation UI.

Tasks:

- add `.pptx` parser,
- extract ordered slide text/notes where possible,
- validate PPTX archive/mime,
- surface skipped media warnings,
- rename/simplify create note/import flows,
- route external sources through Connected Apps,
- preserve existing formats.

**Exit criteria:** PPTX imports usable study content and existing imports still pass regression tests.

---

## MILESTONE 13 — Export Engine v2

**Goal:** exported documents represent rendered Memoria content reliably.

Tasks:

- MMD-aware PDF export,
- Memory cover page template,
- Book cover + TOC + chapters template,
- diagrams/SVG in exports,
- responsive/static fallbacks,
- eliminate raw Markdown syntax leakage,
- align DOCX behavior,
- robust error handling,
- regression fixture suite.

**Exit criteria:** representative Memories and Books export successfully without missing content or raw MMD syntax.

---

## MILESTONE 14 — Notifications, Feedback Permissions & Sharing Polish

**Goal:** clean collaboration surfaces and close authorization gaps.

Tasks:

- redesign notifications,
- fix feedback delete authorization,
- revise feedback model after Collections removal,
- improve sharing dialogs,
- test VIEW/EDIT rules,
- verify revocation/link behavior.

**Exit criteria:** collaboration UI is clean and permissions are enforced server-side.

---

## MILESTONE 15 — Mobile & Cross-Feature Hardening

**Goal:** prove the full product works on real phone-sized screens.

Test at minimum:

- dashboard,
- sidebar/mobile nav,
- Memories list/detail/editor,
- Books list/reader/editor/TOC,
- Favorites,
- Shared with Me,
- notifications,
- diagrams,
- MMD tables,
- multi-column MMD,
- quiz Review Mode,
- quiz Exam Mode,
- exports,
- imports,
- sharing dialogs,
- auth.

**Hard requirement:** no page-level horizontal overflow at common phone widths.

**Exit criteria:** core workflows are usable one-handed/touch-first and no major view escapes screen bounds.

---

## MILESTONE 16 — Full Regression, Data Migration Validation & Release Gate

**Goal:** ensure the broad changes did not chain-break existing features.

Verify:

- old Notes/MMD still render,
- existing quizzes still work,
- Review Mode still works,
- Exam Mode still works,
- reviewer creation still works,
- flashcards/study works,
- search works,
- tags/revisions work,
- sharing works,
- legacy collection migration succeeded,
- imports work,
- PDF/DOCX/book exports work,
- diagrams work,
- SVG visuals are sanitized,
- feedback permissions are correct,
- mobile navigation exposes every required tab,
- lint/test/build pass.

**Exit criteria:** release-ready with no known critical regression.

---

# 20. Acceptance Scenarios

Do not consider this upgrade complete until these end-to-end scenarios work.

### Scenario A — Create and edit a rich Memory

A user creates a Memory, opens the Memoria editor, inserts sections, styled text, multiple columns, a responsive table, an image, and a diagram/SVG visual. They reorder content, edit typography, preview it, save, reopen, and see the same result.

### Scenario B — Move diagram objects beyond initial bounds

A user drags a diagram node past the initial canvas edge. The workspace accommodates it, Fit to content reframes everything, export includes the entire diagram, and nothing is clipped.

### Scenario C — AI-generated visual content

A prompt generated by Memoria instructs an external AI to return one copy/pasteable code snippet. The response contains valid MMD plus safe SVG visual content/references, not an image-generation request. Memoria imports/renders the visual safely.

### Scenario D — Build and resume a Book

A user creates a Book, names the TOC, adds multiple Memories, reorders them, reads halfway through, leaves, returns to Dashboard, and continues from where they left off.

### Scenario E — Share a Book without publishing

A user shares a Book privately with EDIT access and also creates an anyone-with-link VIEW link. Each recipient receives exactly the intended permission. Revoking the link removes access.

### Scenario F — Mobile navigation

On a narrow phone viewport, the user can reach Memories, Books, Favorites, Shared with Me, Study, Diagrams, Notifications, and Settings without desktop-only sidebar assumptions.

### Scenario G — Mobile table

A wide MMD table never widens the page beyond the viewport. The user can still inspect all cells through the contained responsive table behavior.

### Scenario H — Export a Memory

A rich MMD Memory exports to PDF. Page 1 is the Memoria Memory cover. Content begins afterward. Markdown markers are not printed as syntax. Tables, callouts, images, diagrams/SVG, columns, and typography have appropriate static representations.

### Scenario I — Export a Book

A Book exports with a dedicated cover, custom Table of Contents, ordered Memory chapters, and complete content.

### Scenario J — Reprompt safely

A user reprompts a Memory, previews the regenerated version, rejects it without changing their current Memory, then tries again and chooses Replace. A revision exists for the previous content.

### Scenario K — PPTX import

A user uploads a valid `.pptx`; slide text is extracted in order and becomes useful import content. Invalid renamed files fail cleanly.

### Scenario L — Feedback permissions

User A cannot delete User B's feedback merely because the UI exposes an ID. The server rejects unauthorized deletion.

---

# 21. Non-Goals / Guardrails

Do not:

- rebuild Memoria from scratch,
- remove working study modes,
- turn Books into public publishing,
- allow arbitrary raw JavaScript/HTML from AI,
- enable arbitrary CSS in MMD,
- hide desktop overflow bugs using `overflow-x: hidden` at the entire app root without fixing offending components,
- make every screen a dashboard of cards,
- put every action permanently visible,
- silently drop unsupported export content,
- break existing MMD documents,
- delete legacy collection data before migration,
- make SVG sanitizer client-only and assume it is secure,
- rely only on visual permission hiding; enforce access server-side,
- make mobile a reduced-function version of the product.

---

# 22. Implementation Decision Log Requirement

For major architecture choices, add a short entry to the relevant `.context` file containing:

- decision,
- reason,
- affected files/systems,
- migration impact,
- fallback/backward compatibility,
- test coverage.

Especially document decisions for:

- Books vs legacy Collections migration,
- Book permissions and contained Memory access,
- MMD style attribute schema,
- table newline syntax,
- SVG sanitization/storage,
- diagram canvas coordinate/bounds model,
- PDF rendering strategy,
- Favorites resource types,
- last-read persistence.

---

# 23. Final Product Standard

The result should feel like a product intentionally designed for reading, learning, remembering, and building personal study material—not a generic AI interface.

A user should be able to understand where to go, create content without knowing raw MMD, build Books, study with the existing Review/Exam modes, create/edit visual diagrams, use AI-generated SVG visuals safely, share resources with clear permissions, work comfortably from a phone, and export polished documents that preserve the Memoria reading experience.

**Do not stop at “feature exists.” Finish the interaction, responsive behavior, error states, persistence, permissions, export behavior, and visual quality.**
