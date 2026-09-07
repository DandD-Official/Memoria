# AI Content Generation — MMD Integration (planned)

## Current state (see content-system.md for full detail)
- `lib/prompts/note-prompt.ts` currently tells the model to output plain
  Markdown and **explicitly forbids** wrapping it in a code fence.
  **[Now addressed — see "Status" below.]**
- `lib/prompts/quiz-prompt.ts` is unaffected by MMD — quizzes are JSON, not
  Markdown, and stay that way.
- `lib/ai/providers.ts` has no image-generation capability at all today.
- **Correction to the original audit**: `lib/validation/reviewer.ts` already
  has `stripCodeFences()`, wired into both reviewer creation flows (wizard
  + guest), and it already correctly implements the "outer fence vs. inner
  fence" distinction the project brief asks for (verified by hand — see
  milestones.md). The fence-flip below reuses it rather than building a
  new paste-import module from scratch, which is why this shipped without
  needing Din's sign-off on the diagram/media-storage decisions still
  blocking Milestones 3/6.

## Status: implemented (Milestone 5, note/reviewer path only)
- `lib/mmd/ai-instructions.ts` — `buildMmdOutputRules()` generates the
  full block reference + fence requirement from `spec-blocks.ts`, so it
  can't drift from what the parser actually supports.
- `lib/prompts/note-prompt.ts` — both `buildNoteReformatPrompt()` and
  `buildSourcePackage()` now embed `buildMmdOutputRules()` and require
  exactly one outer fence (previously forbade it). Safe to flip because
  `stripCodeFences()` already handles both old-style (no fence) and
  new-style (fenced) responses identically — this was the "breaking
  change" originally flagged as needing sign-off; investigation showed
  it isn't one.
- `components/mmd/validation-notice.tsx` — non-blocking "N blocks couldn't
  be parsed" notice added to both reviewer wizards' preview step, so
  malformed MMD from an AI response is visible before saving rather than
  only discovered later on the reviewer detail page.
- `tests/mmd-ai-instructions.test.ts` — every block name appears in the
  rules text (except `column`, intentionally — see below), fence
  requirement is present, every worked example actually parses.

## Remaining for Milestone 6/13 (Milestone 5 itself is done — see Status above)
1. ~~Flip the fence instruction~~ — done above.
2. ~~Centralized instruction block~~ — done (`lib/mmd/ai-instructions.ts`).
3. ~~Internal code fences~~ — done; reused the existing
   `stripCodeFences()` rather than building a new `lib/mmd/paste-import.ts`
   (see "Correction to the original audit" above) since it already
   implements the outer-vs-inner distinction correctly. No separate
   warning-for-ambiguous-commentary UI was added — `stripCodeFences()`'s
   existing behavior (leave the text untouched if it's not a clean
   single fence wrapping the whole response) already means the fence
   characters stay visible in the preview rather than content being lost,
   which satisfies "let the user review it" without new UI. A dedicated
   warning banner for that specific ambiguous case is a nice-to-have, not
   done.
4. **Image intent, two scenarios, never faked:**
   - **Scenario A (connected provider):** `generateWithProvider` has no
     image capability today. Before "auto-generate the image" can exist,
     an actual image-generation call needs to be added per provider (e.g.
     OpenAI's image endpoint, Gemini's image model) — this is new
     integration work, not a wrapper around something that already works.
     Needs Din's decision on which providers actually get image support
     v1 (could reasonably be OpenAI-only to start).
   - **Scenario B (manual/no provider):** the AI instructions ask the
     external model to emit `:::image-request{...}` when it would want an
     image but can't return one Memoria can store — this requires zero
     new integration work and should ship first.
   - Either way, **never** synthesize a fake `src` — an image only becomes
     a real `:::image` block after actual bytes exist in the media store.
5. **Overdecoration guard.** The instruction text must include the
   brief's explicit decision rule ("would an image/diagram/callout
   significantly improve understanding?") as literal text in the prompt,
   not just as an internal design note — the AI only sees what's in the
   prompt.

## Synchronization mechanism
`lib/mmd/spec-blocks.ts` (planned) is the single source of:
- block name, allowed attributes (name/type/required), one-line
  description used both in the AI prompt and in the editor's insert-menu
  tooltip.
`lib/mmd/ai-instructions.ts` and the editor's insert menu both import from
here — neither hand-maintains its own copy of "the list of blocks."
