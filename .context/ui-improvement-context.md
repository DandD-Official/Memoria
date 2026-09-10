# MEMORIA — UI/UX REFINEMENT, INTERACTION SYSTEM, MMD VISUAL REDESIGN, RESOURCE ACTIONS, AND VERSION HISTORY REPAIR

You are continuing development of the existing **Memoria** project.

This is **not a greenfield redesign** and you must **not reset, replace, or rebuild the application from scratch**.

The current repository already contains a substantial design system, responsive navigation, Books, Memories, Reviewers, Quizzes, Study functionality, sharing, export systems, MMD parsing/rendering/editing, diagram tooling, revision storage, and existing `.context` documentation.

Your task is to perform a **deep refinement pass** over the UI, layout, visual hierarchy, interactions, MMD presentation, editor experience, resource actions, dark/light modes, responsive behavior, and version history.

The goal is not simply:

> "make it prettier"

The goal is:

> **Make Memoria feel like a polished, coherent, highly interactive study and knowledge workspace while preserving all working functionality and improving unfinished or visually weak systems.**

---

# 0. REQUIRED FIRST STEP — AUDIT THE ACTUAL CURRENT PROJECT

Before making implementation changes:

1. Read all relevant `.context` files, especially:
   - `.context/CONTEXT.md`
   - `.context/project-architecture.md`
   - `.context/memoria_ui_books_mmd_upgrade_context.md`
   - `.context/mmd-spec.md`
   - `.context/mmd-editor.md`
   - `.context/diagram-system.md`
   - `.context/ai-content-generation.md`
   - `.context/milestones.md`
   - `.context/books.md`
   - export-related context files

2. Inspect the current implementation before proposing replacements.

3. Pay particular attention to:
   - `app/globals.css`
   - `tailwind.config.ts`
   - `components/ui/*`
   - `components/layout/*`
   - `components/library/*`
   - `components/notes/note-detail.tsx`
   - `components/reviewers/reviewer-detail.tsx`
   - `components/markdown/editor.tsx`
   - `components/mmd/*`
   - `components/diagrams/diagram-editor.tsx`
   - `components/exports/export-menu.tsx`
   - `components/sharing/share-dialog.tsx`
   - `lib/mmd/*`
   - `lib/revisions.ts`
   - `app/api/revisions/route.ts`
   - note/reviewer update APIs
   - Prisma models related to revisions, books, resources, sharing, and diagrams

4. Identify what is already implemented and extend it.

5. Do **not** create duplicate UI primitives or parallel systems if an existing component can be improved.

6. Preserve existing application behavior unless this prompt explicitly changes it.

7. Do not leave placeholder controls, fake interactions, dead buttons, or visually clickable elements that perform no action.

---

# 1. CURRENT PROJECT REALITY — DO NOT IGNORE THIS

The current project already includes:

- Next.js 15
- React 18
- TypeScript
- Tailwind
- Prisma
- reusable UI primitives
- shared button/card/input/dialog/sheet/select/badge/loading/empty/table components
- responsive desktop sidebar
- mobile navigation
- Create menu
- Books
- Memories / Notes
- Reviewers
- Quizzes
- Study features
- Favorites
- Archive
- Shared With Me
- Notifications
- Search
- Settings
- Sharing
- exports
- MMD
- Diagram editor
- Resource revisions
- dark/light theme infrastructure
- existing semantic design tokens
- existing responsive safeguards
- reduced-motion support

Therefore:

**Do not spend this milestone recreating systems that already exist.**

Instead, inspect them and perform a **full quality pass, redesign pass, interaction pass, and consistency pass**.

---

# 2. PRIMARY PROBLEM: RESOURCE DETAIL ACTIONS ARE STILL TOO CLUTTERED

The current Memory/Note detail UI still effectively presents many actions together in the same top area, including combinations of:

- Edit
- Export
- Build Reviewer
- Create Quiz
- Share
- Favorite
- Duplicate
- Archive
- History
- Delete

This creates poor hierarchy and makes the resource header look like a control panel instead of a reading workspace.

Fix this properly.

Do **not** solve it by placing everything inside one giant dropdown.

Use **progressive disclosure**, contextual grouping, responsive adaptation, and clear action priority.

---

# 3. NEW RESOURCE DETAIL ACTION ARCHITECTURE

Create a reusable resource action architecture for Memories and Reviewers, and extend it to other resources where appropriate.

## Desktop

Recommended hierarchy:

```text
[ Edit ]

[ Study / Create ▼ ]

☆ Favorite    Share    Tools ⋯
```

Where:

```text
Study / Create
├─ Create Quiz
├─ Create Reviewer
└─ other context-appropriate study actions
```

And:

```text
Tools
├─ Export
├─ Duplicate
├─ Archive / Restore
├─ Version History
├─ Tags / Metadata if appropriate
├─ Move/Add to Book if supported
────────────
└─ Delete
```

This is only a starting structure.

Inspect actual workflows and choose the best hierarchy.

### Important

- Edit should be prominent when the resource is editable.
- Quiz/Reviewer generation should remain easy to discover.
- Favorite can remain visible because it is a frequent state toggle.
- Share can remain visible for owners if there is enough room.
- History must not compete visually with primary creation actions.
- Delete must never look like a normal primary action.
- Duplicate/Archive should be secondary utilities.
- Export should be accessible but does not need permanent top-bar prominence.

---

# 4. MOBILE RESOURCE ACTIONS

Do not squeeze the desktop action bar onto mobile.

Create a mobile-specific resource action layout.

Example:

```text
Top:
Back        Memory title        ⋯

Bottom / sticky context bar:
Edit     Study/Create     Favorite
```

The `⋯` sheet may contain:

```text
Share
Export
Duplicate
Archive
History
Tags
Delete
```

Use bottom sheets where they are more natural than desktop-style floating dropdowns.

No resource detail page should horizontally overflow.

---

# 5. CONTEXT-AWARE ACTIONS

Actions must respond to state and permissions.

Examples:

- If user cannot edit: do not show Edit.
- While editing: replace Edit with Save / Done behavior.
- Archived resource: show Restore instead of Archive.
- Non-owner viewer: hide owner-only destructive tools.
- Shared editor: expose only actions allowed by permissions.
- Unsupported operation: do not show a fake enabled action.
- Resource with no usable content for quiz/reviewer generation: disable with explanation or hide if appropriate.
- During a pending action: show a localized loading state instead of freezing the whole toolbar.

Centralize this behavior if possible.

Do not duplicate slightly different action logic between Note and Reviewer pages.

---

# 6. RESOURCE HEADER REDESIGN

The current resource header should feel like a document header, not a toolbar.

Improve:

- back navigation
- title placement
- resource type
- Book / subject relationship when available
- tags
- ownership/shared state
- last edited information
- favorite state
- action hierarchy

Suggested conceptual order:

```text
Back

Resource identity
Title
Metadata / Book / Tags / Last updated

Primary actions + compact utilities

Content
```

Give the content area breathing room.

Do not force every piece of metadata onto one row.

---

# 7. READING EXPERIENCE REDESIGN

The Memory viewer should feel intentionally designed for studying.

Improve:

- readable line length
- heading rhythm
- vertical spacing
- code blocks
- tables
- callouts
- diagrams
- images
- galleries
- formulas
- section spacing
- card blocks
- collapsible blocks
- list hierarchy
- link states
- selected/highlighted content where applicable

Use a reading width appropriate for text, but allow wide content such as:

- tables
- diagrams
- galleries
- multi-column sections

to intelligently use more horizontal space without making all paragraphs too wide.

---

# 8. DARK MODE MUST BE REFINED, NOT REBUILT

The project already has dark-mode infrastructure and semantic tokens.

Do **not** replace it with a completely unrelated theme system.

Audit the existing dark theme and improve weak surfaces.

Check every major component for:

- sufficient contrast
- correct semantic background
- clear surface elevation
- readable borders
- readable muted text
- selected state
- hover state
- pressed state
- disabled state
- input backgrounds
- modal/sheet backgrounds
- menu surfaces
- table headers
- MMD blocks
- diagrams
- editor
- code blocks
- toast/feedback UI
- destructive states
- success/warning/info states

Avoid pure black everywhere.

Prefer layered dark surfaces.

---

# 9. LIGHT MODE MUST ALSO RECEIVE A REAL DESIGN PASS

Do not treat light mode as the default that needs no attention.

Audit:

- overly white pages
- weak borders
- low-contrast muted text
- cards blending into backgrounds
- excessive shadows
- washed-out accents
- poorly differentiated nested surfaces

Create subtle visual layering without turning every section into a separate card.

---

# 10. THEME CONSISTENCY

No component should rely on unrelated hardcoded colors when a semantic token should be used.

The current Diagram Editor contains hardcoded visual colors and must be audited carefully.

Move appropriate values into semantic or diagram-specific theme tokens where practical.

Do not blindly convert every SVG color to a global UI token if the color is actually user content.

Differentiate:

- application chrome
- editor chrome
- canvas background
- selection UI
- default diagram object styling
- user-selected diagram styling

---

# 11. MOTION SYSTEM

The project already has motion/reduced-motion foundations.

Build on those foundations.

Create a consistent interaction language for:

- buttons
- cards
- menus
- sheets
- dialogs
- tabs
- accordions
- details blocks
- tool drawers
- editor mode changes
- selection states
- favorite toggles
- save confirmation
- copy confirmation
- sidebar transitions
- resource action menus
- version history transitions
- diagram selection and editing

Suggested duration families:

```text
fast: 100–150ms
normal: 150–220ms
overlay: 180–280ms
```

Animations should be subtle.

Do not animate large layout properties unnecessarily.

Respect both app-level reduced-motion settings and OS `prefers-reduced-motion`.

---

# 12. HOVER, PRESSED, FOCUS, AND SELECTED STATES

Every interactive component must visibly communicate state.

Audit:

- Button
- IconButton
- Card
- Menu item
- Dropdown trigger
- Sheet item
- Navigation item
- MMD interactive block
- diagram node
- table row where interactive
- tabs
- accordions
- toolbar controls
- quiz controls
- history rows
- resource cards
- Book cards

Each must have appropriate:

```text
default
hover
pressed
focus-visible
selected
disabled
loading
```

Do not use hover as the only indicator of interactivity.

---

# 13. TOOLTIPS

The current product has many icon-based and compact actions.

Create a reusable accessible Tooltip primitive if one does not already exist.

Use tooltips for:

- icon-only actions
- unfamiliar diagram controls
- collapsed sidebar icons
- compact resource actions
- editor formatting controls
- version/history actions when clarification is useful

Tooltips may optionally show shortcuts.

Do not place tooltips on every obvious text button.

---

# 14. COMMAND PALETTE

Add a command palette only if it fits cleanly into the existing architecture.

Recommended shortcut:

```text
Ctrl/Cmd + K
```

Potential commands:

```text
Create Memory
Import Memory
Create Book
Create Quiz
Create Reviewer
Create Diagram
Search
Open Favorites
Open Shared With Me
Edit current resource
Export current resource
Share current resource
Open Version History
```

The command palette must supplement normal UI, not become the only way to reach actions.

---

# 15. MMD — REDESIGN THE BLOCKS THAT ALREADY EXIST

Do not invent a completely separate custom-element system.

The current `BLOCK_DEFS` already supports:

```text
Callouts:
note
tip
warning
danger
info
success

Code:
code

Educational:
definition
key-concept
example
important
summary
math

Layout:
section
card
columns
column
details

Media:
image
gallery

Diagram:
diagram

AI / visual:
image-request
svg
```

Redesign the visual treatment of **all current MMD blocks**.

Each block must look intentional in both dark and light modes.

---

# 16. MMD VISUAL LANGUAGE

Create a unified MMD visual system.

MMD elements must feel related but not identical.

For example:

## Callouts

Use semantic differences without using huge solid colored panels.

Support:

- icon
- title
- subtle tinted edge/surface
- readable body
- nested educational blocks

## Definition

Make the term visually dominant.

## Key Concept

Make it recognizable as important study material without making it look like a warning.

## Example

Use a clear worked-example structure.

## Important

Use strong emphasis appropriate for exam-critical content.

## Summary

Make it visually feel like a recap.

## Math

Create a distinct mathematical surface with horizontal containment for long expressions.

## Section

Do not just create a card around every section.

Use section spacing, heading hierarchy, optional subtitle, and contained nested blocks.

## Card

Give default/outline/highlight types meaningful visual differences.

## Columns

Improve responsive layout, spacing, and mobile stacking.

## Details

Use polished accordion behavior.

## Image

Improve size, alignment, caption, loading, error, and fullscreen behavior.

## Gallery

Use an adaptive responsive gallery instead of a rigid grid.

## Diagram

Treat it as an embedded interactive visual.

## Image Request

Make it clearly a pending visual placeholder/editor action—not a broken image.

## SVG

Render sanitized SVG cleanly and consistently with image/diagram surfaces.

---

# 17. ADD NEW MMD ELEMENTS ONLY WHEN JUSTIFIED

The previous design direction suggested many possible new elements.

Do **not** add new syntax simply because it sounds useful.

First determine whether the desired experience can be expressed through existing blocks.

For example:

- flashcard behavior may belong to Study rather than MMD
- question/answer may be better represented using existing educational blocks unless embedded study interactions are intentionally supported
- timelines/comparisons/tabs may be worthwhile only if fully supported throughout the pipeline

If you add a new MMD block, it must be integrated into the actual single-source-of-truth system.

Every new block must work across:

- `BLOCK_DEFS`
- schema/validation
- parser
- renderer
- editor insert tools
- editor reference guide
- AI instruction generation
- AI import validation
- export registry
- PDF export
- DOCX export
- plain fallback behavior if applicable
- tests
- documentation

Do not create renderer-only syntax.

---

# 18. INTERACTIVE MMD ELEMENTS

Improve appropriate existing blocks with interaction.

## `details`

- smooth expand/collapse
- accessible summary
- keyboard behavior
- reduced-motion support

## `image`

- click to expand
- optional fullscreen preview
- zoom when useful
- caption
- proper loading/error state

## `gallery`

- click-to-expand images
- keyboard navigation where practical
- responsive layout

## `diagram`

- open larger view
- fit/zoom controls
- edit affordance only when user has permission
- clear embedded state

## `image-request`

When editable:

- upload image
- attach existing media
- attach/create diagram if supported
- replace/remove

When read-only:

- do not show dead editing controls

Do not make regular paragraphs randomly interactive.

---

# 19. MMD EDITOR — IMPROVE THE EXISTING EDITOR, DO NOT REPLACE IT BLINDLY

The current project already has:

- Markdown editor
- MMD editor helpers
- insert menu
- block map
- reference guide
- preview rendering

Audit these pieces together.

The target experience should resemble a purpose-built Memoria editor rather than a textarea with miscellaneous buttons.

Recommended modes:

```text
Editor
Split
Preview
```

Remember the user's last mode if appropriate.

---

# 20. EDITOR TOOL ORGANIZATION

Do not show all MMD tools simultaneously.

Use categories such as:

```text
Text
Layout
Study
Media
Visuals
Code
```

Map existing blocks into these categories.

Example:

```text
Study
├─ Definition
├─ Key Concept
├─ Example
├─ Important
├─ Summary
├─ Note
├─ Tip
└─ Warning
```

```text
Layout
├─ Section
├─ Card
├─ Columns
└─ Details
```

```text
Media / Visuals
├─ Image
├─ Gallery
├─ Diagram
├─ SVG
└─ Image Request
```

Avoid a giant always-visible toolbar.

---

# 21. EDITOR INSERT UX

The user should not need to memorize MMD attributes.

When inserting blocks with attributes, use structured dialogs/sheets.

Examples:

## Image

```text
Source
Alt text
Caption
Alignment
Size
```

## Section

```text
Title
Subtitle
```

## Card

```text
Title
Subtitle
Icon
Type
```

## Code

```text
Language
Title
Theme
```

## Diagram

```text
Select existing diagram
or
Create diagram
Caption
```

## Math

```text
Formula
```

Insert valid MMD automatically.

---

# 22. CONTEXTUAL BLOCK EDITING

Where feasible, selecting an MMD block in editing mode should expose a small contextual control surface.

Examples:

```text
Edit properties
Duplicate
Move
Delete
```

For images:

```text
Replace
Caption
Alignment
Size
Delete
```

For diagram blocks:

```text
Open diagram
Edit diagram
Caption
Replace
Delete
```

Do not create a huge persistent inspector unless the content needs it.

---

# 23. DIAGRAM EDITOR — MAJOR VISUAL AND INTERACTION PASS

The existing Diagram Editor already supports important behavior such as:

- draggable nodes
- resizing
- connecting nodes
- undo
- redo
- pan
- zoom
- saving
- diagram selection
- SVG preview generation

Do **not** throw this functionality away.

Improve the current editor.

Current weak areas include the visually basic canvas/tooling and hardcoded styling.

Redesign:

- editor shell
- tool palette
- canvas
- zoom controls
- selected-object styling
- resize handles
- connector mode
- property editing
- diagram list
- save state
- undo/redo feedback
- empty canvas
- dark mode
- mobile mode

---

# 24. DIAGRAM CANVAS BEHAVIOR

The current implementation bounds dragged nodes to a fixed canvas area.

Re-evaluate this.

The user should be able to create diagrams without feeling trapped by an arbitrary initial boundary.

Possible approaches:

- expandable logical canvas
- larger infinite-feeling workspace
- auto-expanding document bounds
- pan/zoom workspace with content-aware fit

Do not crop objects just because they were moved near an original boundary.

Preserve reliable export coordinates.

---

# 25. DIAGRAM SELECTION UI

Selected nodes should clearly show:

- selection boundary
- resize handles
- connector handles or clear connect mode
- hover state
- drag state

Do not rely on one tiny corner handle only if more discoverable controls can be added without clutter.

Properties may appear in a compact contextual panel.

---

# 26. VERSION HISTORY — DEBUG THE EXISTING SYSTEM END TO END

The application already has revision infrastructure.

Current behavior includes:

- `ResourceRevision` persistence
- JSON snapshots
- revisions keyed by owner/resource type/resource id
- duplicate-snapshot prevention
- autosave throttling
- revision count trimming
- GET revisions API
- NOTE restore
- REVIEWER restore
- preservation of the current state before restore

Therefore:

**Do not replace this system unless a real architectural defect requires it.**

Instead, determine why History appears broken or incomplete to the user.

Audit:

1. Whether revisions are actually created during:
   - manual note save
   - note autosave
   - reviewer manual save
   - reviewer autosave
   - AI rewrites/regeneration if applicable
   - imports/replacements if applicable

2. Whether duplicate revision creation is happening due to revisions being created in more than one layer.

3. Whether autosave throttling produces expected user-visible versions.

4. Whether stale revision trimming is working.

5. Whether restored content refreshes correctly in:
   - detail page
   - lists
   - dashboard
   - search
   - Book views

6. Whether snapshots contain all required fields.

7. Whether permissions are correct.

8. Whether revision errors are being silently swallowed.

9. Whether version timestamps are displayed correctly.

10. Whether history is usable on mobile.

---

# 27. CURRENT HISTORY UI IS TOO WEAK

The current revision history UI is essentially a small dropdown/popover with rows and a Restore button.

Replace this presentation with a proper History experience.

Recommended:

Desktop:

```text
Version History
┌────────────────────┬─────────────────────────────┐
│ Version timeline   │ Version preview             │
│                    │                             │
│ Today              │ Rendered preview or diff    │
│ 10:42 — Autosave   │                             │
│ 10:15 — Save       │                             │
│ Yesterday          │                             │
└────────────────────┴─────────────────────────────┘
```

Mobile:

Use a full-height or large bottom sheet.

Do not use a tiny 288px dropdown for substantial document history.

---

# 28. VERSION HISTORY INFORMATION

Each history entry should display useful metadata where available or derivable:

- timestamp
- title
- version source/type
- manual save vs autosave if tracked
- restore operation if tracked
- AI rewrite if tracked
- import if tracked
- optional user label

If the current schema does not track source/type, decide whether adding an additive metadata field is worth it.

Do not add a migration unless the benefit is meaningful.

---

# 29. VERSION PREVIEW

Allow selecting a revision before restoring it.

Show:

- title
- rendered MMD/Markdown preview
- timestamp
- optional diff from current version

Do not make Restore the first interaction.

The user should be able to inspect what will be restored.

---

# 30. VERSION DIFF

Implement a readable diff where practical.

For text/MMD:

- added
- removed
- changed

Avoid presenting raw unreadable JSON.

For MMD structural changes, optionally identify:

```text
Section changed
Diagram reference changed
Image changed
Block removed
Block added
```

A basic reliable text diff is better than a fragile over-engineered structural diff.

---

# 31. VERSION RESTORE SAFETY

Preserve the current safe behavior:

```text
Current state
↓
User chooses old revision
↓
Current state is captured
↓
Old revision is restored
↓
Restored state becomes current
↓
User can still return to previous state
```

Keep this.

Replace `window.confirm()` with the existing proper ConfirmDialog/Dialog system.

Use clear messaging:

```text
Restore this version?

Your current version will be preserved in Version History.

[Cancel] [Restore version]
```

---

# 32. VERSION HISTORY FEEDBACK

After restoration:

- show success feedback
- refresh current content
- update timestamps
- close or update history panel appropriately
- ensure restored title/content appear immediately
- ensure no stale client state remains

If restoration fails:

- keep the history panel open
- show the actual error
- do not pretend restoration succeeded

---

# 33. QUIZ REVISION INCONSISTENCY

The revisions API currently accepts `QUIZ` as a resource type in GET parsing, while restore support is only implemented for NOTE and REVIEWER.

Audit whether Quiz version history is intended.

Choose one of these cleanly:

### Option A
Implement full Quiz revision support.

### Option B
Do not expose Quiz history until the system supports it.

Do not leave partially exposed functionality.

---

# 34. FAVORITE INTERACTION

Favorite currently behaves as a normal button with a star icon.

Improve it.

Use:

- compact visible favorite control
- filled/unfilled state
- subtle transition
- tooltip where icon-only
- instant UI feedback when safe
- rollback/error state if request fails
- optional toast

Do not require a page refresh just to make the action feel responsive if local optimistic state can safely handle it.

---

# 35. DUPLICATE AND ARCHIVE FEEDBACK

Current resource actions silently return when API calls fail.

Improve feedback.

For Duplicate:

- show loading state
- navigate only after success
- show error on failure

For Archive:

- update UI quickly
- communicate success
- ensure archived page state is correct

For Restore:

- same quality as Archive

No library action should fail silently.

---

# 36. SHARE EXPERIENCE

Audit the existing ShareDialog.

Improve:

- permission selection
- link-sharing hierarchy
- copy-link feedback
- loading states
- errors
- current collaborators
- owner vs editor vs viewer states
- mobile sheet behavior

Keep Book sharing and resource sharing consistent without conflating their permission models.

---

# 37. EXPORT EXPERIENCE

The current export system already supports multiple formats and dedicated PDF/DOCX logic.

Do not replace working export architecture.

Improve the UI around it.

Suggested Export panel:

```text
Export Memory

Format
PDF
DOCX
Markdown
Memoria JSON

Options
Include images
Include diagrams
Preserve layout
Include metadata
```

Only show options that the underlying exporter genuinely supports.

Never show fake export options.

Show progress using the existing export progress capabilities where available.

---

# 38. UI PRIMITIVES — COMPLETE THE SYSTEM

The project already contains primitives such as:

```text
Button
Card
Input
Badge
Dialog
Sheet
Select
EmptyState
LoadingState
ResponsiveTable
ConfirmDialog
```

Audit whether reusable primitives are missing.

Possible additions:

```text
Tooltip
DropdownMenu
ContextMenu
Tabs
Accordion
Toast
IconButton
Popover
CommandPalette
SegmentedControl
Skeleton
```

Only add primitives that will actually be reused.

Do not install a huge UI library just to avoid implementing a few coherent components unless the project architecture explicitly benefits from it.

---

# 39. CONSISTENT FEEDBACK SYSTEM

Build or improve a single feedback pattern for:

- save success
- save failure
- copied link
- favorite
- archive
- restore
- duplicate
- export
- revision restore
- diagram save
- import
- quiz/reviewer creation

Avoid scattered:

```text
alert()
confirm()
silent failure
random inline message
```

Use proper dialogs and toast/inline status based on severity.

---

# 40. EMPTY, LOADING, AND ERROR STATES

Audit every major screen.

Improve states for:

- Memories
- Books
- Reviewers
- Quizzes
- Favorites
- Archive
- Shared With Me
- Search
- Notifications
- Diagrams
- Version History
- Import
- editor loading
- MMD media loading
- failed media
- failed export

Use the shared EmptyState and LoadingState primitives where appropriate.

Do not create 15 different visual languages.

---

# 41. RESOURCE CARDS

The project already contains shared ResourceCard behavior.

Refine it.

Cards should prioritize:

```text
Title
Small useful preview/context
Book / type / tags
Last activity
Important status
```

Do not permanently show every possible icon.

Use hover/focus quick actions on pointer devices and accessible menus on touch devices.

Avoid excessive card borders and nested-card appearance.

---

# 42. BOOK UI

Books already exist as a first-class destination.

Refine their visual identity.

Books should not look identical to generic resource cards.

Use restrained differentiation such as:

- spine/accent treatment
- optional cover/icon
- memory count
- recent activity
- shared state
- progress/resume state where meaningful

Do not turn the page into a fake bookshelf unless the design language genuinely supports it.

---

# 43. DASHBOARD

A previous milestone already redesigned parts of the dashboard.

Do not restart it.

Audit the current result and improve weak composition.

Prioritize:

1. Continue where you left off
2. Create
3. Recent Memories / Books
4. useful study continuation
5. favorites only when useful

Avoid a dashboard made entirely of equal rectangular cards.

---

# 44. NAVIGATION

Current project already has:

- grouped desktop navigation
- collapsed sidebar behavior
- mobile bottom navigation
- More sheet
- Create sheet

Keep this architecture unless a genuine usability problem exists.

Refine:

- active state
- spacing
- icon alignment
- collapse animation
- label hierarchy
- selected state
- mobile sheet layout
- visual consistency
- touch targets

Do not reintroduce Collections.

Books remain first-class.

---

# 45. MOBILE QUALITY PASS

Audit at minimum:

```text
320px
360px
375px
390px
430px
768px
1024px
desktop
```

Hard rule:

**No page-level horizontal scrolling.**

Check:

- resource action headers
- editor
- MMD columns
- tables
- diagrams
- galleries
- modals
- sheets
- dropdowns
- quiz player
- reviewer content
- Book views
- history
- share
- export
- settings
- auth

Use internal scrollers only where semantically appropriate.

---

# 46. MMD COLUMNS

The current MMD system already supports `columns` / `column`.

Improve layout behavior.

Desktop:

- balanced gaps
- sensible minimum widths
- support multiple columns
- avoid awkward equal-width layouts when content differs greatly

Mobile:

- stack cleanly
- preserve content order
- do not shrink text into unusable narrow columns

Do not break nested valid MMD.

---

# 47. TABLES

The app already includes a responsive table primitive.

Make sure:

- Markdown tables
- MMD tables if applicable
- Reviewer tables
- other application tables

all follow the same containment strategy.

No table may cause page-level horizontal overflow.

Use:

- contained scroll viewport
- visible scroll affordance
- accessible focus
- optional stacked mode for simple tables

---

# 48. ACCESSIBILITY

Audit and improve:

- semantic buttons
- keyboard access
- focus trapping
- focus restoration
- screen-reader labels
- icon-only actions
- dialog titles/descriptions
- sheet navigation
- command palette
- diagram controls
- MMD details
- fullscreen image viewer
- version history
- table containment
- color contrast

Keep touch targets around 44×44px where practical.

Do not rely on color alone for state.

---

# 49. PERFORMANCE

Visual improvements must not make Memoria sluggish.

Avoid:

- excessive blur
- giant shadow layers
- expensive animations
- unnecessary re-renders
- loading every history snapshot at full rendered size immediately
- rendering full diagrams when thumbnail/preview is enough
- loading large media before needed

Use lazy rendering where it genuinely improves performance.

---

# 50. PROMPT GENERATION MUST MATCH THE UI/MMD SYSTEM

The project already has MMD AI instruction generation and tests.

Do not maintain a second hand-written list of blocks.

Continue treating `BLOCK_DEFS` as the canonical source where intended.

Whenever MMD behavior changes, update:

- AI instructions
- prompt generation
- editor insert tools
- reference documentation
- export behavior
- tests

The AI must only be instructed to generate syntax the current application supports.

---

# 51. AI SHOULD NOT OVERUSE CUSTOM BLOCKS

Generated study content should not look like every paragraph was wrapped in a custom component.

Prompting should communicate:

> Use Memoria Markdown elements selectively when they materially improve structure, comprehension, recall, comparison, visual explanation, or emphasis.

Prefer plain Markdown for ordinary prose.

Use custom MMD for meaningful structure.

---

# 52. IMAGE / DIAGRAM PROMPTING

The current system distinguishes between:

- real images
- image requests
- stored diagrams
- sanitized inline SVG

Preserve those distinctions.

Do not instruct the AI to pretend an `image-request` is an actual image.

If a generated visual can be safely expressed as sanitized inline SVG, use the supported SVG path.

If a real user-provided visual is needed, use image-request appropriately.

If a real diagram is stored separately, use diagram references correctly.

---

# 53. COMPONENT CONSOLIDATION

Audit duplicated page-specific implementations.

Particular candidates:

- Note/Reviewer detail action rows
- resource headers
- action menus
- save status
- editor wrappers
- metadata displays
- favorite/archive/duplicate controls
- History launcher
- export launcher

Build reusable composition where it improves maintainability.

Do not abstract merely for abstraction's sake.

---

# 54. TESTING — DO NOT JUST VISUALLY PATCH IT

Add targeted tests for logic and interaction where the current test stack supports it.

At minimum verify:

- revision creation rules
- duplicate snapshot prevention
- autosave throttle
- revision restore safety
- revision permission checks
- unsupported Quiz restore behavior or new Quiz support
- MMD block changes
- any new MMD syntax
- AI instruction synchronization
- export compatibility
- resource action APIs
- responsive helper logic where testable

If component interaction tests require new infrastructure, decide carefully whether adding jsdom/testing-library is justified.

Do not weaken existing tests.

---

# 55. RUN THE REPOSITORY QUALITY GATES

After meaningful milestones run:

```bash
npm run lint
npm run test
npm run build
```

Also run TypeScript validation if not already covered.

Fix root causes.

Do not delete tests merely to make the build green.

---

# 56. UPDATE `.context`

This project already relies heavily on `.context`.

Do not create redundant context files if an existing one is the correct source.

Update the appropriate files with:

- resource action hierarchy
- UI interaction rules
- theme refinements
- MMD visual language
- newly added MMD blocks if any
- history/version behavior
- diagram interaction changes
- responsive rules
- accessibility rules
- milestones completed
- known gaps

If a new context file is necessary, keep it focused.

Possible new files only if genuinely useful:

```text
.context/ui-interactions.md
.context/version-history.md
```

Do not duplicate content already maintained elsewhere.

---

# 57. IMPLEMENTATION ORDER

Work progressively.

## Phase 1 — Current-state audit

- inspect current screens/components
- identify the worst UI inconsistencies
- map duplicate action systems
- verify revision behavior
- identify MMD styling weaknesses

## Phase 2 — Shared interaction primitives

- Tooltip
- menu/dropdown if missing
- Toast/feedback if missing
- compact IconButton if useful
- reusable action grouping

## Phase 3 — Resource detail redesign

- Memory detail
- Reviewer detail
- resource header
- responsive tool organization
- Favorite/Share/Tools
- action error handling

## Phase 4 — History repair and redesign

- verify backend creation/restoration
- fix bugs
- build proper version history panel/sheet
- preview
- restore confirmation
- feedback
- optional diff

## Phase 5 — MMD visual redesign

- all current blocks
- dark/light mode
- spacing
- typography
- interactive details/images/galleries/diagrams

## Phase 6 — MMD editor refinement

- grouped tools
- insert dialogs
- contextual editing
- editor/split/preview polish
- reference guide

## Phase 7 — Diagram editor refinement

- theme support
- tool hierarchy
- selection handles
- canvas behavior
- controls
- mobile experience

## Phase 8 — Application-wide UI consistency

- Dashboard
- Books
- Favorites
- Archive
- Shared
- Search
- Notifications
- Settings
- auth
- Quiz/Reviewer screens

## Phase 9 — Responsive and accessibility QA

- narrow phones
- tablet
- desktop
- keyboard
- touch
- reduced motion
- no horizontal page overflow

## Phase 10 — Tests, documentation, final cleanup

- tests
- lint
- build
- `.context`
- remove dead UI
- remove duplicated temporary code

---

# 58. QUALITY BAR

The finished product must feel:

- polished
- calm
- modern
- highly usable
- responsive
- visually consistent
- intentionally interactive
- study-focused
- distinctive to Memoria

Avoid:

- generic AI dashboard design
- excessive gradients
- excessive glassmorphism
- huge rounded containers everywhere
- too many permanent buttons
- icon overload
- random animation
- inconsistent shadows
- random hardcoded colors
- nested cards inside cards inside cards
- silent failures
- desktop UI merely squeezed onto phones

---

# 59. FINAL ACCEPTANCE CHECKLIST

Before marking this milestone complete, verify:

```text
[ ] Memory detail toolbar is no longer cluttered
[ ] Reviewer detail toolbar follows the same system
[ ] Desktop and mobile actions differ appropriately
[ ] Primary and secondary actions are visually obvious
[ ] Delete is safely separated
[ ] Favorite interaction feels responsive
[ ] Archive/Duplicate errors are visible
[ ] Share UI is polished
[ ] Export UI is polished
[ ] Version History is genuinely functional
[ ] Version restore preserves current state
[ ] History allows preview before restore
[ ] Quiz revision inconsistency is resolved intentionally
[ ] MMD blocks are visually redesigned
[ ] MMD blocks work in light mode
[ ] MMD blocks work in dark mode
[ ] MMD interactive blocks are accessible
[ ] Editor tools are grouped and not overwhelming
[ ] Insert workflows do not require memorizing syntax
[ ] Diagram editor visually matches Memoria
[ ] Diagram canvas no longer feels artificially constrained
[ ] Every action has hover/focus/pressed/disabled/loading states
[ ] No page-level horizontal scrolling exists
[ ] Mobile resource actions are usable
[ ] Tables remain contained
[ ] Images/galleries/diagrams are responsive
[ ] Reduced motion is respected
[ ] AI prompting matches actual supported MMD
[ ] Exports still work
[ ] Sharing still works
[ ] Books still work
[ ] Study/Quiz/Reviewer behavior still works
[ ] Existing permissions remain correct
[ ] Existing tests still pass
[ ] New relevant tests pass
[ ] npm run lint passes
[ ] npm run test passes
[ ] npm run build passes
[ ] .context documentation matches implementation
```

---

# 60. FINAL INSTRUCTION

Do not stop after making the obvious top toolbar look cleaner.

Perform a **full UI/UX quality audit of the existing Memoria application** and fix weak or inconsistent design wherever it appears.

However, do this **incrementally and architecture-aware**.

Preserve the strong foundations that already exist.

Improve what is actually present.

Do not recreate already-completed milestones.

Do not regress existing features.

Do not leave partially working UI.

The end result should feel like one deliberately designed product, from Dashboard to Memory reading, MMD blocks, editing, diagrams, Books, history, sharing, exports, quizzes, and mobile use.
