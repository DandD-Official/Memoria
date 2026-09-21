# Reading and export fixes — September 20, 2026

## Correction: artwork is standalone

The user clarified that the generated logo, hero, and three illustrations must not be applied to the application. The image integration and associated branding substitutions documented below were reverted. The original landing page and interactive learning example were restored. Scrolling, export, action, shared-status, and code-rendering fixes remain. Historical artwork findings below no longer describe the current UI.

## Scope and coverage

Reviewed the note and study-guide readers, public note and book views, shared action controls, code rendering, landing artwork, and PDF/Word download entry points. The project uses Next.js 15, React 18, Tailwind semantic tokens, native dialog sheets, docx, and jsPDF. References: `.context/Export_Context.md`, `.context/books.md`, `.context/mmd-spec.md`, and `public/brand/memoria/README.md`. No AGENTS.md was found.

| Domain | Evidence inspected | Result |
| --- | --- | --- |
| Accessibility | Outline focus target; export keyboard navigation; existing dialog focus handling; code scroll region | Source checks complete; browser interaction not verified |
| Layout | Reader header, outline height/overflow, action wrapping, bounded export popup | Fixed source defects; narrow viewport and zoom not visually verified |
| Writing | Export labels and reader help; hero and three illustration captions | Removed obsolete image-only export wording; added visible explanatory copy |
| Typography | Code CSS cascade, fenced Markdown rendering, document export fonts and page geometry | Shared renderer and measured editable text positions; Office font/layout rendering not verified |
| Colors | Current light-theme export tokens; declared brand pairs | Ink/paper 12.65:1; accent label/soft surface 5.72:1; actual image-overlay contrast not verified |
| UI polish | Action grouping, existing control styles, logo and shared-view identity | Reused project controls and original brand assets; runtime states not visually verified |

## Findings addressed

| Severity | Domain | Location | Before | After | Why |
| --- | --- | --- | --- | --- | --- |
| High | Layout | `app/globals.css:481`, `components/library/document-reader.tsx:24` | Sticky outline had no height bound or independent scrolling | Viewport-bounded, keyboard-focusable outline with hidden scrollbar | Long outlines remain reachable without moving the document |
| High | Typography | `app/globals.css:359`, `components/mmd/renderer.tsx:31` | Generic pre/code rules overrode code themes; plain Markdown bypassed custom rendering | Higher-specificity theme rules and one Markdown renderer | Both custom and fenced code preserve readable themed formatting |
| Medium | Layout | `components/library/resource-actions.tsx:104` | Separate desktop menus and mobile action arrangements | Shared Edit/Study group, direct Export/Share, and More sheet | Frequent actions stay visible and secondary actions are grouped |
| Medium | UI polish | `app/s/[token]/page.tsx:36`, `app/icon.svg:1` | Public note header and favicon used an old book icon | Current logo, favicon, and shared-note indicator | Public and signed-in identities agree |
| Medium | Writing | `components/landing/brand-scenes.tsx:3` | Generated illustrations were unused by the current landing page | Hero with logo and headline; three labeled, captioned scenes | Artwork now communicates the learning workflow |

## Export verification

Notes, reviewers, books/memories, quizzes, and guest document exports share the same page-based export path. Word contains native positioned text boxes, including formatting and external links. Background artwork is rasterized after ordinary text is hidden. PDF first attempts Word conversion and otherwise writes selectable PDF text over the artwork. Markdown, JSON, plain text, Anki, and SVG exports retain their existing native formats.

The fixed text boxes preserve page placement rather than providing flowing Word paragraphs. Images and diagrams remain visual assets. The client PDF fallback substitutes standard PDF fonts; exact font fidelity and non-Latin glyph coverage are not guaranteed in that fallback. This is not a verified pixel-identical export claim.

Checks: 199 tests across 37 files passed, including DOCX XML/text/link/page-dimension assertions, PDF text extraction, and fenced-code rendering. ESLint and TypeScript passed. An isolated `next build` passed using the existing generated Prisma client. The normal build's Prisma generation encountered a locked Windows query-engine DLL.

Not verified: browser screenshots and interactions, 320px/200% zoom behavior, Word/LibreOffice rendering, pixel comparisons, and dark-theme visual inspection. Browser discovery returned no available browser; Word/LibreOffice was not available for document rendering.

## Verdict

Approve the source and automated checks within the coverage above. Visual and Office fidelity remain unverified; do not treat this report as visual sign-off.

## September 2026 export revision

The current paginator is `lib/export/geometric-pages.ts`, with the DOM-free numeric planner in `page-planner.ts`. It measures nested lines, rows, headings and visuals once and clips pruned copies of the flow at safe boundaries. Book pages keep their styling during measurement; the public paginator signature and post-pagination TOC derivation are unchanged. Text is never uniformly scaled to fit. An impossible protected cut produces an explicit error.

`table-fit.ts` plans proportional widths, a 10px font floor and repeated-first-column segments; `table-layout.ts` applies them before geometry measurement. Export CSS removes scrollports, wraps code and cells, and supplies breathing room. Table continuation headers reserve space and are cloned with the same colgroup. Export columns/gallery/section sizes no longer depend on screen breakpoints.

`text-lines.ts` merges baseline fragments within their paragraph/cell into styled runs, selects Office-safe fonts, clamps character scaling to 92-108%, bounds width slack to the cell and detects/resolves ordinary overlaps. `editable-pages.ts` creates one native Word text box per line with exact measured line spacing. External and Book internal links remain runs. Background rasterization remains 2x. jsPDF fallback uses the merged lines, with its existing standard-font substitution and non-Latin limitations.

Automated gate: lint, 353 tests / 42 files, full Prisma + Next build passed. No browser was available: stress-fixture fill, blank pages, clipping and overlap counts were not measured. Word COM failed in the sandbox and stalled outside it; no PDF was produced, and the test process was cleaned up. LibreOffice was not found. The earlier verification totals above are historical. See implementation-review.md for the complete inventory, decisions, known limitations and reproducible manual checks.

## Export regression correction — September 21, 2026

The user reported broken text and extra pages containing text without its design. The previous line-box change passed XML-content tests but introduced a structural Word pagination defect: `docx.Textbox` creates a body paragraph around every floating shape, and those outer paragraphs were assigned the full measured text-line height. Dense pages could therefore overflow Word's body, moving some shapes onto additional pages while their background remained anchored to the original page.

`word-line.ts` now creates floating shape **runs**. Each canonical page has one small anchor paragraph containing the background, bookmark and all editable line runs. Only the paragraphs **inside** the text boxes have measured exact spacing. The regression test verifies that 200 line boxes across two dense pages create two artwork/text anchors, plus the explicit section boundary, with no per-line body paragraphs. Line boxes permit height growth to avoid hard clipping during editing. They remain native editable Word text, including styled runs and links.

The production exporter no longer calls the overlap resolver to move text after measuring artwork. Baseline clustering now handles small inline font changes without changing reading order. Missing natural-width measurements leave text at 100% scale rather than stretching it using approximate character widths. Font-stack order, sans-serif fallback and whitespace normalization are corrected. Word line-box placement compensates for line leading; PDF fallback restores each run's measured x/width so substituted fonts cannot accumulate drift across a sentence.

`page-fragments.ts` snapshots measured container geometry. Surviving children retain their absolute positions inside their styled parent when off-page branches are pruned; the previous placeholder strategy could change margin collapse, grid sizing and paragraph wrapping. Inline text, tables and lists retain their internal DOM. This also keeps continuing card backgrounds/borders present with the text. Large leaf tables/lists are copied intact for correctness; container branches outside the page are pruned.

Pagination uses a 92% preferred fill threshold, trims carried-over top margins to an 8px inset and suppresses trailing padding-only pages. It does not stretch a short final page or shrink text. Export prose uses 1.5 line height, 8px paragraph spacing, 4px list-item spacing and 16–20px section/heading separation. If staggered columns have no simultaneous safe cut, export stacks those columns; only an impossible heading-with-next preference is relaxed afterwards. Rows and glyph lines remain protected.

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| High | `editable-pages.ts`, `word-line.ts` | Full-height body paragraph per floating line | One anchor paragraph per designed page | Text and artwork cannot be split by hidden paragraph accumulation |
| High | `text-lines.ts`, `editable-pages.ts` | Estimated baselines split/reordered inline runs; overlap repair moved ink | Cluster by baseline, preserve run order and measured coordinates | Maintain sentence readability and text/artwork alignment |
| High | `page-fragments.ts` | Pruning could change surrounding flow | Snapshot placement and retain styled ancestors | Preserve design on continuation pages |
| Medium | `page-planner.ts`, `mmd-export.css` | 75% fallback threshold and generous screen paragraph leading | Prefer fuller pages with role-based gaps | Use space while separating topics |

Validation: 362 tests across 43 files, lint and TypeScript passed. Tests cover dense Word anchor structure, editable/link text, PDF extraction, mixed font order, coordinate preservation, fill preference, margin trimming and continuation geometry. Full build result is recorded in the implementation review. Browser rendered-page metrics and Office rendering are **not verified**. Browser selection returned no available browser; its discovery retry was then rejected by automatic approval review because the tool usage limit was reached. No alternate browser control was used to bypass that rejection.

Manual check: run `npm.cmd run dev`, export the user's affected note and `tests/fixtures/mmd-export-stress.mmd` as DOCX/PDF, then compare the page count, continuation-card borders, table headers, mixed-format sentences and footer positions. Confirm text remains editable in Word and compare the Book reader/TOC. Automated source coverage is approved; this is not visual approval.

## 2026-09-21 Books and Notebooks follow-up

Implemented named Notebook subjects using ordered, validated collection metadata and per-item subject IDs. The additive migration was applied; legacy Book IDs and share links remain valid. Subjects can be added, renamed, moved, and removed without deleting memories. Notebook documents preserve subject order and labels in native reading and export.

The native reader now has responsive one/two-page spreads, chapter/heading navigation, per-reader bookmarks, and chapter-relative resume state. Anonymous bookmarks stay in this browser. Signed-in bookmark writes validate book access and chapter membership. Attached quizzes offer session-local review and exam modes; existing private quiz attempt APIs are not exposed. Guest preview suppresses owner/member privileges on reading and export and prevents posting discussion as the signed-in owner.

Creation wizards now occupy their own page workspace and offer search over bounded source lists. Diagram canvas and header spacing have been reduced. The landing quiz marks Retrieval correct and the two distractors incorrect.

Validation: 372 tests across 45 files passed; TypeScript and lint passed. Next production build passed against the generated Prisma client (the earlier Prisma generate encountered a locked Windows engine DLL). Database migration deployed successfully. Live browser/Word visual checks remain unverified: the browser tool was previously rejected by automatic approval review due to its usage limit; no alternate browser was used. No claim of visual parity is made.

## 2026-09-21 Notebook titles, contents, downloads, and branding

Renamed user-facing notebook subjects to titles while retaining persisted subject IDs for compatibility. Contents now group memories under separate numbered title headings, with local hierarchical entry indices (1.1, 1.2, 2.1). Stable IDs keep identically named titles separate. Headings stay with the first entry; continuation contents pages repeat the relevant title. Reader navigation and chapter labels use the same numbering.

Removed View as Guest buttons. Share Preview uses the public/guest access path. Export controls read Download; downloadBlob always uses an attachment link instead of the operating-system share sheet. Replaced old book-shaped brand marks in site headers, onboarding, public reading, export headers and the favicon with MemoryMark. Existing SVG/PNG brand assets were already current; inspected the PNG.

Validation: 375 tests in 47 files passed, TypeScript and lint passed. After the last export-mark replacement, 27 focused document/download tests also passed. The initial production build compiled but failed on missing shared .next artifacts with the development server running. A production build using temporary isolated .next-check output and an extended verification tsconfig passed all 77 generated routes; temporary Next config overrides were then removed. Live browser and Word layout checks remain unverified.
