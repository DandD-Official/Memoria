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
