# Editor, diagrams and export implementation — 2026-09-20

## Part 1 decisions and evidence

- CodeMirror 6 loads dynamically; the public MarkdownEditor interface is unchanged. Source remains mounted across view changes so undo history survives.
- A shared DOM-free scanner owns fence syntax, code-region suppression and original-source spans. Block definitions and Zod schemas remain in spec-blocks.ts. Books already walks parseMmd; no parallel grammar was added there.
- Rendering keeps LIFO matching. Diagnostic indentation heuristics identify an unclosed inner fence without changing rendering semantics. Invalid optional values remain warnings; malformed fence lines render fail-safe errors.
- Required-attribute fixes insert an empty placeholder for the author to fill. They intentionally cannot make an unknown required value valid automatically. Code language completion remains free text; embedded language-specific highlighting is not implemented.
- Original-parser golden expectations were generated from HEAD before replacing the parser and stored as JSON. No old grammar remains in production or tests.
- New controls use semantic tokens, 44px targets, visible native focus and 16px source text. Problems and shortcut details are disclosed on demand. No new motion was introduced. These are source inspections, not a visual approval.
- Checks so far: lint passed; 235 tests / 38 files passed; normal Prisma + Next build passed before the final completion/history adjustments. Final Part 1 rebuild in progress.
- Browser skill bootstrap succeeded, but getForUrl returned “No browser is available”; the documented discovery check returned an empty list. No browser screenshots, touch/IME, screen-reader, 320px, 200% zoom or dark-theme runtime checks were performed.
- Runtime is Node 24.19.0; the project declares Node 22.x. Package installation reported this mismatch. CodeMirror installation succeeded with zero reported vulnerabilities after the initial sandboxed network attempt failed.

## Manual Part 1 verification

Run `npm.cmd run dev`, sign in, and edit a note/reviewer. At 320px and desktop widths, test Source/Split/Preview, all insertion tools, undo across view changes, list indentation, nested blocks, completion, F8/Shift+F8, Ctrl/Cmd+., Esc then Tab, and the Problems drawer. Save malformed source and confirm the non-blocking message. Repeat in dark mode and with a touch keyboard/IME. Paste malformed source into guest/reviewer creation previews and confirm line-numbered diagnostics.

## Parts 2 and 3

Pending the ordered implementation gates. No diagram or export fidelity claims have been made.
