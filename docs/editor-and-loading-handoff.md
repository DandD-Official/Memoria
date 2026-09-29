# Editor and loading handoff

## Behavior

- Together navigation and the mobile More menu order Notebooks, Workspaces, then Shared with me.
- In the MMD editor, Split connects both scroll panes to the same source passage. Headings, paragraphs, tables and MMD blocks supply landmarks; interpolation handles different source and rendered heights. CodeMirror's wrapped-line measurements are reconciled after scrolling. Images, expanded details and resizing trigger recalculation.
- Type `::` or `:::` for block suggestions. Attributes and supported values come from the existing MMD schema. Ctrl+Space or the Suggestions button opens Markdown and MMD snippets. Enter accepts; Tab moves between snippet fields. Existing diagnostics and quick fixes remain available.
- Shared loading components cover root loading, authenticated pages, document views, guest activities and asynchronously opened editor/dialog content. Saving and exports retain their existing action-level busy states. AI note generation also shows a visible waiting state.
- The landing entrance draws the Memoria mark and fades away after 1.25 seconds. It does not block input, needs no image download or JavaScript timer, and is skipped with reduced motion. The light and dark themes use the existing semantic colors.
- The moodboard remains at `public/brand/memoria/light-and-dark-moodboard.png`.

## Maintenance

The scroll implementation is in `components/mmd/editor/use-scroll-sync.ts` and `lib/mmd/scroll-sync.ts`. Source positions are opt-in through `parseMmd(source, { sourcePositions: true })`; normal parser output and exports retain their existing contracts. `lib/mmd/completions.ts` reads the existing block definitions rather than maintaining a separate schema.

Do not remove the preview scroller's `relative` positioning: it contains positioned accessibility elements inside long tables and prevents them from extending the page's scroll height.

## Verification

- ESLint and TypeScript passed.
- The production build passed, including generation of all 88 static pages.
- All 441 tests across 54 suites passed, including the new source mapping and completion regressions.
- Headless Edge checks passed for forward and reverse scrolling on a long document with headings, uneven paragraphs, callouts and tables. Tested heading alignment was within one pixel; document bottoms matched.
- Browser checks passed for accepting a snippet, opening suggestions, mobile horizontal overflow, landing dismissal, reduced motion and absence of client exceptions. Light/dark editor screenshots were inspected.
- The temporary browser test route was removed before the production build.

These checks are local. Authenticated production workflows, external AI/OAuth services and deployment are not covered by the browser smoke checks. No database migration is required for these changes.
