# Diagram System — Design (planned, not yet implemented)

## Status: data layer implemented; canvas editor NOT yet built

Given repeated "continue" instructions without a response to the four
blocking decisions below, proceeded with the recommendations already
written in this file (@xyflow/react, Postgres `Bytes` for preview images,
OpenAI-only image gen deferred entirely, guest diagrams excluded) rather
than continuing to block. Flagging this assumption here in case it's
wrong — nothing below is hard to undo, but the Prisma migration is real
schema, not a no-op.

**Built this pass** (see .context/milestones.md, Milestone 3 for the full
file list): the `Diagram` Prisma model, `ResourceType.DIAGRAM` (giving
diagrams the existing sharing/permissions system for free), the versioned
Zod schema (`lib/diagrams/schema.ts`), the repo layer
(`lib/diagrams/repo.ts`, including duplication per the brief's explicit
requirement), and REST API routes (list/create, get/update/delete,
duplicate, preview-image) all following this codebase's existing
`withApiErrorHandling` + `canView`/`canEdit`/`isOwner` conventions
exactly. `:::diagram{id}` now resolves against the real API instead of
always showing a static "not built" placeholder.

**NOT built**: the actual canvas editor — shapes, connectors, drag/
resize/select/delete/duplicate/undo/redo, the toolbar, zoom/pan. This is
the single largest remaining piece of the whole MMD project and the one
requiring the actual `@xyflow/react` npm dependency, which cannot be
verified to even install correctly in this sandbox (no network). Writing
several hundred lines of canvas-wrapping UI against a library I cannot
run once and see fail is a materially different risk profile than
everything built so far, all of which was either pure TypeScript (hand-
verifiable) or a mechanical mirror of an existing, working pattern in
this codebase. Recommend this be the very next piece, built and reviewed
in its own pass once Din can actually run `npm install` and confirm the
data layer above works end-to-end first — building the editor on top of
an unverified foundation compounds risk rather than isolating it.

Until the editor exists, every `:::diagram{id}` reference will resolve to
"not found," because nothing creates rows in the new `Diagram` table yet
— this is expected, not a bug in the resolution logic itself (which can
be exercised directly via the API, e.g. `POST /api/diagrams`).

## Library evaluation (Milestone 3 requirement: check before building from scratch)

Nothing diagram/canvas-related exists in `package.json` today (confirmed).
Options considered:

| Library | Fit | Concern |
|---|---|---|
| **@xyflow/react (React Flow)** | Node/edge graph model matches the brief's `nodes[]`/`edges[]` schema almost exactly. Built-in drag, zoom/pan, selection, connection handles, custom node components (so Memoria's own shape components render inside it). MIT licensed. Large community, actively maintained. | Undo/redo and multi-select-drag-align are not built in — need a thin wrapper (a simple state-snapshot stack is enough for "focused," not "professional routing engine"). |
| tldraw (SDK) | Richer freeform whiteboard/shape editor, closer to draw.io visually. | Heavier, more opinionated canvas model to wrap; newer SDK versions carry a watermark/commercial-license requirement above a usage threshold — a licensing decision Din needs to make, not one to default into silently. |
| Build from scratch (SVG + custom hit-testing) | Full control. | This is exactly the "recreate draw.io from scratch" the brief says not to do; only justified if neither library fits, which isn't the case here. |

**Recommendation: @xyflow/react.** It covers shapes-as-nodes, connectors-as-edges,
drag/select/delete/duplicate out of the box, and keeps Memoria's persisted
schema independent of the library's internal state (React Flow's node/edge
objects map cleanly to Memoria's own versioned schema below without leaking
library-specific types into the database or into MMD documents).
**This needs Din's sign-off before `npm install @xyflow/react`** since it's
a new runtime dependency — flagging rather than silently deciding.

## Data model (versioned, Zod-validated)

```ts
// lib/diagrams/schema.ts (planned)
interface MemoriaDiagram {
  version: 1;
  type: "memoria-diagram";
  nodes: Array<{
    id: string;
    shape: "rectangle" | "rounded-rectangle" | "circle" | "ellipse" |
           "diamond" | "parallelogram" | "cylinder" | "document" |
           "decision" | "terminator" | "database" | "process";
    x: number; y: number; width: number; height: number;
    label?: string;
    style?: { fill?: string; stroke?: string; strokeWidth?: number;
              dashed?: boolean; fontSize?: number;
              textAlign?: "left" | "center" | "right" };
  }>;
  edges: Array<{
    id: string;
    source: string;      // node id
    target: string;      // node id
    label?: string;
    directional: boolean;
    style?: { strokeWidth?: number; dashed?: boolean };
  }>;
}
```

Stored as its own DB table (`Diagram` model, planned — does not exist yet):
`id`, `ownerId`, `title`, `data Json` (the schema above), `version Int`,
`createdAt`/`updatedAt`, following the exact ownership/cascade pattern
already used by `Note`/`Reviewer`. Diagrams are referenced from documents
by `id` only (`:::diagram{id="..."}`), never embedded inline — this keeps
Note/Reviewer content small and lets a diagram be reused across documents
or duplicated independently later without touching document content.

Duplication: `POST /api/diagrams/:id/duplicate` (planned) creates a new row
with a new `id`, copies `data` verbatim, leaves the original untouched —
straightforward given diagrams are already their own DB rows.

## Media abstraction (needed for `:::image`, not diagram-specific)

No media storage exists today. Minimum viable abstraction (per the brief's
"add only the minimum architecture necessary"):
- A `Media` table: `id`, `ownerId`, `kind` (`UPLOADED`|`GENERATED`),
  `mimeType`, storage reference. **Where bytes actually live is an open
  question** — the existing stack has no blob storage integration
  (`lib/integrations/` has none). Options: (a) a new
  `IntegrationConnection`-style provider for S3/R2/Cloudinary, or
  (b) store small images as `Bytes` in Postgres like `Note.content`
  (simplest, consistent with existing patterns, fine at Memoria's likely
  image volume, but not ideal for large files long-term).
  **This is a decision for Din**, not something to default silently —
  it changes the deployment/infra story (Vercel + Postgres today, per
  `vercel.json`).
- `:::image{src="media://<id>"}` resolves through this table; external
  `https://` URLs pass through only if/when an allowlist is defined
  (none exists today — currently no MMD image points anywhere until this
  is built).

## Export
- PNG/SVG snapshot generated client-side from the React Flow canvas
  (`@xyflow/react` supports exporting the viewport to an image) at
  save-time or on-demand, stored via the media abstraction above, and it's
  *that* rendered image `ImageRun`/PDF-image call that both exporters
  embed — not a live re-render of the diagram library in Node. This keeps
  `lib/pdf-export.ts`/`lib/word-export.ts` diagram-agnostic: they just
  place an image, exactly like the existing (unused-for-content-images)
  `ImageRun` brand-logo code already does in `word-export.ts`.

## Guest mode
Diagrams require a stable `id` and DB row per the spec ("documents
reference diagrams by ID"). Guest mode has no DB writes. Proposed: guest
mode diagrams are held in memory only (React state, not persisted), with
an explicit "diagrams won't be saved in guest mode — sign up to keep them"
notice, rather than silently losing them or building a parallel
localStorage-backed guest diagram store (localStorage is already
disallowed for artifacts elsewhere in this stack's conventions, and guest
mode's existing design is deliberately stateless). **Flagging for Din's
confirmation before building it either way.**
