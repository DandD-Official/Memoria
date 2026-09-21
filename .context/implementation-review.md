# Editor, diagrams and export implementation — 2026-09-21

## Part 1 decisions and evidence

- CodeMirror 6 loads dynamically; the public MarkdownEditor interface is unchanged. Source remains mounted across view changes so undo history survives.
- A shared DOM-free scanner owns fence syntax, code-region suppression and original-source spans. Block definitions and Zod schemas remain in spec-blocks.ts. Books already walks parseMmd; no parallel grammar was added there.
- Rendering keeps LIFO matching. Diagnostic indentation heuristics identify an unclosed inner fence without changing rendering semantics. Invalid optional values remain warnings; malformed fence lines render fail-safe errors.
- Required-attribute fixes insert an empty placeholder for the author to fill. They intentionally cannot make an unknown required value valid automatically. Code language completion remains free text; embedded language-specific highlighting is not implemented.
- Original-parser golden expectations were generated from HEAD before replacing the parser and stored as JSON. No old grammar remains in production or tests.
- New controls use semantic tokens, 44px targets, visible native focus and 16px source text. Problems and shortcut details are disclosed on demand. No new motion was introduced. These are source inspections, not a visual approval.
- Checks so far: lint passed; 235 tests / 38 files passed; normal Prisma + Next build passed before the final completion/history adjustments. Final Part 1 rebuild passed, including Prisma generation.
- Browser skill bootstrap succeeded, but getForUrl returned “No browser is available”; the documented discovery check returned an empty list. No browser screenshots, touch/IME, screen-reader, 320px, 200% zoom or dark-theme runtime checks were performed.
- Runtime is Node 24.19.0; the project declares Node 22.x. Package installation reported this mismatch. CodeMirror installation succeeded with zero reported vulnerabilities after the initial sandboxed network attempt failed.

## Manual Part 1 verification

Run `npm.cmd run dev`, sign in, and edit a note/reviewer. At 320px and desktop widths, test Source/Split/Preview, all insertion tools, undo across view changes, list indentation, nested blocks, completion, F8/Shift+F8, Ctrl/Cmd+., Esc then Tab, and the Problems drawer. Save malformed source and confirm the non-blocking message. Repeat in dark mode and with a touch keyboard/IME. Paste malformed source into guest/reviewer creation previews and confirm line-numbered diagnostics.

## Part 2 decisions and checks

- V2 requires paper color. Keeping DIAGRAM_SCHEMA_VERSION=1 and emptyDiagramData as the legacy helper preserves existing consumers; CURRENT_DIAGRAM_VERSION and emptyDiagramV2 are used by the new workspace. The persistence schema accepts both.
- Native SVG remains vendor-independent. A searchable 75-shape library and 60+ static icons use shared geometry. Diagram content colors are persisted document colors; all workspace chrome uses semantic theme tokens.
- Only one auxiliary panel is expanded at a time to avoid a wall of controls on small screens. Library/inspector become bottom disclosures. Clipboard JSON is bounded and schema-validated, IDs and parent references are remapped.
- Large images are downscaled on the server with Sharp, preserving owner checks and avoiding external SVG references. This is an image-processing dependency, not a canvas vendor.
- Long labels wrap and show an ellipsis when the shape is too small; full text remains editable in the inspector. Language-specific shape details are editable compartments rather than a domain model.
- Pure tests cover migration, shape paths/ports, routing/free ends/self-loops, grouping, alignment, z-order, clipboard hostility, gesture history and layouts. Original v1 SVG has a byte-level golden regression. Image tests exercise actual Sharp output and verify owner-scoped calls, dimensions and unsafe SVG rejection.
- Not verified: real-browser drag/resize/rotate/pinch, 500-node frame rate, 320px/200% zoom, keyboard/screen-reader flow, light/dark visuals, database save/load and permission integration against a live account.

Manual: `npm.cmd run dev`, open `/diagrams`, create a template, connect ports and reconnect/free an endpoint, add bends, edit labels, group and move contents, undo each gesture, copy/paste between diagrams, test PNG/SVG, save then embed through a note and Book. Repeat in the full-screen Diagram picker, at 320px, with touch, keyboard and both themes.

## Part 3 decisions and evidence

- Part 2 gate completed: lint, 336 tests / 41 files, and full Prisma + Next build passed after the containment-layout adjustment.
- Retained canonical A4 pages, 2x background artwork, native positioned editable Word text, Word conversion and selectable jsPDF fallback. No flowing-paragraph replacement or image-quality reduction.
- Geometry is measured once on an isolated clone. Safe boundaries include nested text lines and rows; overlapping protected ranges prevent cuts through parallel-column lines. Page clones prune off-window block subtrees while retaining inline flow. Text is never uniformly scaled to fit a page.
- Table widths use measured min/max content, a 13-to-10px font policy, and column segments repeating the first column. Headers repeat on continuations and stay with their first row. Code wraps with a hanging indent. Figures alone can have their visual height constrained.
- Export columns, galleries and section heading size are independent of viewport breakpoints. The measurement stage preserves Book styling. Book chapter page numbers and TOC are still derived after pagination through the unchanged public signature.
- Editable text is grouped by cell/paragraph and baseline. One Word box contains multiple formatted/link runs, safe fonts, bounded 92–108% character scale, cell-bounded width slack and exact measured line spacing. Export fonts are Arial/Calibri, Georgia/Cambria and Consolas/Courier New, including Books.
- Table planning, page planning and text-line geometry are pure modules. `planTableRows` tests the row-chunk policy; production uses measured protected row ranges in the geometric planner rather than applying a second row packer.
- New stress fixture covers 12 columns, 60 rows, nested tables, long strings/code, mixed runs, CJK, emoji, lists, headings and details. Its parse/Unicode checks pass. Word XML checks verify one box/four runs, scaling, exact spacing, safe fonts, external links and internal anchors. PDF fallback extraction remains green.
- Gates: lint passed; 353 tests / 42 files passed; full normal build passed, including Prisma generation. Node remains 24.19.0 despite the declared 22.x engine.

## Verification boundaries and known limitations

- Stress-fixture fill rate, blank-page count, clipped-content count and text-box overlap count: **not measured**, because browser discovery returned no available browser. Synthetic planner tests exceed 92% fill; that is not a DOM or visual measurement of the fixture.
- Word is installed. Sandboxed COM creation failed with 80070520 (no logon session); an approved unsandboxed attempt stalled without producing a PDF. The helper was interrupted and its identified hidden Word process cleaned up. No Word visual fidelity or PDF overlap claim is made. LibreOffice and pdftoppm were not found.
- Fixed geometric slicing cannot always find a safe simultaneous cut in staggered parallel columns or an oversized protected heading/row group. It fails explicitly with a split-content message rather than silently clipping or shrinking text. Repeated headers occupy real page space. Tall rows/headings can also lower page fill; the 92% fixture target remains unverified.
- Cell width compensation is bounded; extreme font substitutions and dense geometry can remain unresolved. The jsPDF fallback still substitutes Times/Helvetica/Courier and lacks guaranteed CJK/emoji glyph coverage. Word and fallback PDF are not claimed pixel-identical.
- Original v1 SVG serialization is golden-tested. Migrating then resaving v2 may use the new edge-marker rendering; browser visual equivalence after resave was not measured.
- Embedded language-specific source highlighting is not implemented. No 500-node performance measurement, touch/IME, phone, dark-theme, screen-reader or live database/permission smoke test was possible.

## File inventory across the complete task

Part 1 created: `lib/mmd/{grammar,diagnostics,editor-commands}.ts`, `components/mmd/editor/code-editor.tsx`, `tests/{mmd-source,mmd-golden}.test.ts`, `tests/fixtures/mmd-legacy-golden.json`.

Part 1 modified: `lib/mmd/{ast,parser,ai-instructions}.ts`, `components/markdown/{editor,renderer}.tsx`, `components/mmd/{renderer,render-context,validation-notice}.tsx`, `components/mmd/blocks/error-block.tsx`, note/reviewer detail save notices, package manifest/lock and MMD docs. Deleted: `components/mmd/editor/block-map.tsx`, `lib/mmd/block-map.ts`, `tests/mmd-block-map.test.ts`.

Part 2 created: `lib/diagrams/{editing,geometry,history,icons,images,layout,routing,shapes,svg-v2}.ts`; `components/diagrams/editor/{workspace,toolbar,canvas,node-view,edge-view,handles,palette,inspector,minimap,context-menu,text-overlay,my-diagrams,template-gallery}.tsx`; `tests/{diagram-v2,diagram-images,diagram-golden}.test.ts`; `tests/fixtures/diagram-v1-golden.json`.

Part 2 modified: `lib/diagrams/{schema,repo,svg}.ts`, `lib/validation/diagram.ts`, diagram API routes, `lib/books/resolve.ts`, `components/mmd/blocks/diagram-block.tsx`, diagram editor entry point/page, semantic guide tokens in globals, package manifest/lock and diagram docs. No destructive schema migration.

Part 3 created: `lib/export/{page-planner,table-fit,table-layout,text-lines,geometric-pages}.ts`, `tests/export-layout.test.ts`, `tests/fixtures/mmd-export-stress.mmd`. Modified: `lib/export/{pagination,editable-pages}.ts`, `app/mmd-export.css`, `components/mmd/blocks/{layout-blocks,media-blocks}.tsx`, `tests/editable-pages.test.ts`, export docs. Shared docs updated: this report, milestones and README.

## Exact remaining checks

From the repository in PowerShell:

```powershell
npm.cmd run lint
npm.cmd run test
npm.cmd run build
npm.cmd run dev
```

1. Sign in, create a note and paste `tests/fixtures/mmd-export-stress.mmd` into Source. Export Word and PDF. Repeat with the browser viewport at 390px and 1440px; compare page counts and every table/code continuation. Confirm all 12 columns and 60 rows, repeated headers, no clipped lines and editable cell text. Measure occupied height / 1003px on each non-final page, excluding covers and forced breaks; record blanks, clipping and overlaps separately.
2. Add the note to a Book, open its reader, follow every TOC link and compare reader page numbers with Word/PDF. Check the cover and details expansion. Exercise note, reviewer, quiz and guest exports, plus a document containing owned images and saved diagrams.
3. For a small Office line-model probe:

```powershell
$env:MEMORIA_EXPORT_ARTIFACTS = Join-Path $env:TEMP 'memoria-export-check'
npx.cmd vitest run tests/editable-pages.test.ts
Start-Process (Join-Path $env:MEMORIA_EXPORT_ARTIFACTS 'mixed-lines.docx')
```

   Inspect the first line in Word: mixed bold/italic/underlined source link and internal chapter link must share a line without touching. Export to PDF from Word and inspect it. This synthetic file tests text boxes, not full-document artwork fidelity. If LibreOffice is installed, run `soffice --headless --convert-to pdf --outdir "$env:MEMORIA_EXPORT_ARTIFACTS" "$env:MEMORIA_EXPORT_ARTIFACTS\mixed-lines.docx"`.
4. Use the Part 1 and Part 2 manual steps above at 320px and 200% zoom, with keyboard/touch and light/dark themes. Test sharing/owner permissions with two accounts against the configured database.

## Follow-up: export regression correction

The September 21 follow-up supersedes the earlier production overlap-resolution and Word-box implementation notes. The user reported broken text and text-only extra pages. Word now uses one body anchor paragraph per canonical page, with all floating editable line shapes and the background attached to it. This removes full-height per-line body paragraphs that could create extra pages without artwork. Browser-measured text is no longer nudged independently of the artwork; baseline grouping and PDF run positioning were corrected.

New files: `lib/export/word-line.ts`, `lib/export/page-fragments.ts`, `tests/export-page-fragments.test.ts`. Modified: `editable-pages.ts`, `text-lines.ts`, `geometric-pages.ts`, `page-planner.ts`, export CSS, and editable-page/layout tests. Geometry snapshots preserve styled container fragments when pruning. The page planner prefers 92% fill, removes carried-over top-margin waste and drops padding-only tail pages; spacing remains distinct between paragraphs, lists and sections. Short final pages are not artificially stretched.

Decisions: retain native positioned Word text and 2x artwork; use a single anchor rather than special-case outer-paragraph heights; allow text-box height growth when edited; preserve measured coordinates instead of post-layout overlap movement; stack columns only when their lines cannot share a safe page cut; retain entire leaf tables/lists to avoid reflow when pruning. The full source/typography review is in `reading-export-review.md`.

Checks: lint, TypeScript and 362 tests / 43 files passed. Full production build passed, including Prisma generation. No rendered fill/clipping/overlap metrics or Office visual validation. The browser discovery retry was blocked by automatic approval review due to the tool usage limit; no alternate browser was used to bypass it.
