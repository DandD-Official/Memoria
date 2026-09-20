# Diagram and Visual System

## Current status

Milestone 3 is implemented for the focused v1 workflow. Memoria has a
versioned `Diagram` schema, ownership-aware CRUD/duplicate APIs, a native SVG
editor, drag/select/delete/undo/redo, connectors, SVG preview snapshots, and
`:::diagram{id="..."}` resolution.

The editor is intentionally dependency-free. The persisted schema is not
coupled to React Flow, tldraw, or another canvas vendor. Resize handles,
advanced shape geometry, multi-select alignment, and viewport zoom/pan are
optional polish rather than data-model blockers.

## Visual options

Memoria supports three distinct visual paths:

1. **Editable diagrams** — authored in `/diagrams`, persisted as `Diagram`
   rows, and referenced with `:::diagram{id="..."}`.
2. **Uploaded SVG/raster assets** — uploaded by the authenticated user,
   stored as owned `Media` bytes, and referenced as
   `:::image{src="media://<id>" alt="..."}`.
3. **Existing external assets** — HTTPS SVG, PNG, JPEG, or WebP URLs may be
   referenced with `:::image{src="https://..." alt="..."}`. MMD does not
   execute raw inline HTML/SVG; SVG files are treated as image assets.

`:::image-request{purpose="..." alt="..."}` is an intent marker only. It
offers upload, deterministic SVG-template creation, and diagram-editor
actions. It never calls an image-generation provider and never fabricates a
URL. The built-in SVG templates are concept card, process flow, and
comparison; they create ordinary safe SVG files that become `Media` assets.

## Media safety and storage

The `/api/media` upload route accepts SVG, PNG, JPEG, and WebP up to 5 MB.
SVGs containing scripts, event-handler attributes, `javascript:` URLs, or
`foreignObject` are rejected. `media://` URLs resolve through an authenticated
owner-scoped route. Small assets are stored as Postgres `Bytes` for now.

## AI boundary

AI providers are text-generation integrations only. Their configured user API
keys are not reused for image generation. AI instructions must choose an
existing diagram, cite a real supplied asset, or emit `image-request`; they
must never claim to have generated image bytes or invent an image URL.

## Persistence and previews

Diagram structure is validated by `lib/diagrams/schema.ts`. The editor saves
an SVG snapshot to `Diagram.previewImage`; the preview route serves it to MMD
embeds. Exporters may later embed these stored snapshots directly.

Guest mode does not persist diagrams or media because both require an owner.

## Native workspace v2 ? 2026-09-21

Version 1 remains readable and its direct SVG output is protected by an original-output golden fixture. Version 2 requires a paper color and adds kinds, ports/free endpoints, rotation, container ownership, richer styling, bend points, routing and markers. `hydrate` upgrades only in memory; saves write schemaVersion 2. No database migration was added. Failed hydration is marked `loadError` and cannot be saved over.

`geometry.ts` and `shapes.ts` supply the native React SVG canvas and serialized SVG. `icons.ts` stores static paths. Routing, editing, layouts and history are DOM-free modules. The old editor entry point delegates to components/diagrams/editor (workspace, toolbar, canvas, node/edge views, handles, palette, inspector, minimap, text overlay, context menu, library and templates). Source SVG strings are no longer injected during pointer moves. Gesture previews use refs and requestAnimationFrame; commit creates one history entry (200 retained).

The library and inspector use collapsible panels; on narrow screens these are bottom disclosures. Connections are explicit port drags or keyboard C/arrows/Enter. Proximity Snap-connect is optional and off by default. Shape and edge labels remain escaped text, never HTML.

Owned media is resolved server-side against the diagram owner, sanitized for SVG, re-encoded as WebP with Sharp, and reduced to at most 1024 pixels plus a count-based byte budget. Diagram SVGs contain inline raster data and an explicit paper rectangle. Books resolve the same images after access checks. Preview upload failures are visible. Existing API permission checks remain.

Verification and remaining runtime limitations: implementation-review.md. Direct v1 output is byte-identical in the golden test; no claim of measured Office or browser visual fidelity is made.
