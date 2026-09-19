# Memoria: the learning journal

## Product map

This reconstruction supersedes the old visual direction in `.context/ui-improvement-context.md`. Authentication, permissions, validators, MMD, compressed content, generation, imports, exports, grading and scheduling remain the engine.

| Place | Purpose | Capabilities and routes |
| --- | --- | --- |
| Desk | Choose the next useful action | `/dashboard`: active attempts, due cards, recently edited material, missed questions, subjects |
| Library | Keep connected knowledge | `/library`, `/notes`, `/reviewers`, `/diagrams`, `/quizzes`, favorites, archive, tags, history, duplication |
| Practice | Turn understanding into recall | `/study`, due queue, decks, seven question types, five quiz configurations, review/exam play, timer |
| Progress | Understand learning over time | `/progress`, attempts, review history, study sessions, actionable weak results |
| Together | Curate and share study spaces | `/books`, `/shared`, collections, membership, publishing, permissions, passwords, expiry, feedback and reading progress |
| Search | Retrieve knowledge | `/search`, command search, resource grouping, tags, diagrams and collections |
| Preferences | Shape the environment | `/settings`: appearance, study defaults, navigation, accessibility, integrations, AI, account and data |

Capture at `/notes/import` supports files, pasted text, manual Markdown, JSON, Drive and Notion. Sources lead to reviewers and quizzes; reviewers lead to flashcards and quizzes. Diagrams are a first-class library surface and reusable content. Results lead to explanations, source reviewers, repeat practice and mastery. Memory uses persisted due dates.

Authentication retains registration, verification, reset, session conflict and onboarding. Guest mode retains reviewers, flashcards, quizzes, exams, prompts and JSON import with explicit temporary storage. Public `/s/[token]` and `/c/[slug]` URLs remain stable.

## Design system

- Connected `m` mark; margin annotations, numbered sections, index rules and restrained highlighting.
- Editorial serif headings, sans controls, mono index labels and timers.
- Warm paper, open sections, document sheets, bordered utility panels. Evergreen actions, lime highlights; dark mode charcoal green and sage.
- Top-level Desk / Library / Practice / Together, contextual index, mobile navigation, command search. Focus mode removes workspace navigation.
- One next action, supporting context, visible disclosures for advanced controls.
- Native controls, labels, recovery, pending states, focus, 44px touch targets, accessible overlays.
- Short color transitions; system and account reduced-motion support.

## Preservation and verification

No schema migration. Existing public URLs and APIs remain compatible. Search adds owner-scoped diagram and collection metadata. Existing dirty frontend files are user work; functional improvements are retained while presentation is reconstructed.

Verify lint, types/build, existing business-logic tests, public and guest browser flows, narrow widths, and authenticated flows when a test session and database are available. Report unverified states explicitly.

## Continuation checkpoint — 19 September 2026

- Fixed the Tailwind build failure caused by applying the `group` marker from CSS; the marker now lives on resource links.
- Unified command and full-page search through `lib/library-search.ts`. All five resource groups stay owner-scoped, archived material stays excluded, and empty queries only return suggestions when explicitly requested. Search does not read document content, diagram payloads, or book passwords.
- Added a full-page search form and made diagram links open the requested owned diagram. Missing or inaccessible diagram IDs return not found.
- Added Together navigation for books and shared material on desktop as well as mobile. Existing navigation preferences control the library index; account reduced motion reaches portaled overlays.
- Kept visited guest activities mounted so switching activities preserves drafts. Added unique field labels, wrapping style choices, selected-state announcements, and native radio groups with arrow-key selection.
- Connected progress links to a missed-question filter with original question numbering. Unfinished attempts cannot expose the result answer key. Result summaries describe question scores rather than claiming to measure memory.
- Preserved existing document heading anchors, corrected progress punctuation, and made theme changes apply the full palette together. Muted-text tokens now meet 4.5:1 on the checked surfaces.

## Interface verification scope

Next.js, Tailwind semantic tokens, and the existing React components. The product and styling conventions above guided this pass. Browser coverage covers public entry pages, guest activities, and the actual shared shell/dialog/reader components mounted with fixture content in a temporary local route. That route was removed before the final build. Authenticated database flows were not exercised.

| Domain | Evidence inspected | Result |
| --- | --- | --- |
| Accessibility | Guest form labels and state, keyboard radio answers, nested native dialogs, focus restoration, mobile navigation, reduced-motion overlays | Corrected and checked; screen reader testing not verified |
| Layout | Public entry pages at 320, 768, and 1440px; guest controls, shared shell, and long resource titles at 320px | Guest overflow corrected; no page overflow in the shell fixture. RTL and browser zoom not verified |
| Writing | Search actions, navigation preferences, guest storage explanation, progress/results labels | Corrected terminology and recovery paths in the inspected flows |
| Typography | Responsive headings and resource titles, reader text and table fixture, mobile input sizing | Checked in rendered screenshots; no broad typography audit claimed |
| Colors | Light/dark text tokens against paper, surface, muted surface, raised surface, and accent-soft | Minimum checked ratio 4.52:1 light and 4.63:1 dark; action pairs exceed 10:1 |
| UI polish | Theme switch, shared dialog/sheet behavior, loading state and guest activity selection | Palette transitions corrected; focus and reduced motion checked |

Resolved interface findings:

| Severity | Domain | Location | Before | After | Why |
| --- | --- | --- | --- | --- | --- |
| HIGH | Layout | `components/guest/guest-reviewer-flow.tsx:131` | Style choices extended beyond 320px | Choices wrap with visible selected state | All choices must remain reachable |
| HIGH | Accessibility | `components/guest/guest-reviewer-flow.tsx:122`, `components/guest/guest-quiz-flow.tsx:214`, `components/quizzes/question-input.tsx:17` | Unlabelled inputs and unnamed radio groups | Associated labels, activity-specific IDs, and native radio grouping | Inputs announce their purpose and answers support arrow keys |
| HIGH | Colors | `app/globals.css:14`, `app/globals.css:70` | Muted text reached 4.20:1 light / 4.38:1 dark on accent-soft | Adjusted semantic tokens; checked minima above 4.5:1 | Small text must stay readable on its actual surfaces |
| MEDIUM | Writing | `components/settings/settings-form.tsx:108` | Preferences described a removed sidebar | Preferences describe the library index | Labels match the controls they change |
| MEDIUM | UI polish | `components/layout/theme-provider.tsx:31` | Colors transitioned independently during a theme change | Transitions suppressed for the palette swap | Prevents briefly unreadable foreground/background combinations |

Checks passed:

- `npm.cmd run check`: lint, 187 tests across 34 files, Prisma generation, TypeScript validation, and production build (75 static pages).
- `git -c core.whitespace=cr-at-eol diff --check`.
- Headless Edge: landing, login, registration, password recovery/reset, email verification, and guest pages rendered at 320/768/1440px. Form submission and email delivery were not invoked.
- Guest JSON import, review feedback, exam feedback after submission, scoring, arrow-key answers, draft retention, and dark-mode field colors passed without browser errors after fixes. Flashcard rendering used a stubbed prompt response; live generation was not tested.
- Shared-component fixture: nested Escape dismissal, focus restoration, mobile sharing navigation, reduced-motion overlays, and 320px containment passed. The Next.js development toolbar was hidden for fixture screenshots because it intercepted the mobile dock.

**Not verified:** authenticated end-to-end flows with a test account/database, real shared tokens, live connected imports/generation, screen readers, RTL, browser zoom, and export appearance in a browser. Existing business-logic and export tests passed.

**Verdict: Approve within the inspected scope.** The unverified flows above still need their own integration pass before claiming full application verification.
