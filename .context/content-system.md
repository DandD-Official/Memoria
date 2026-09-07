# Content System — Current State (pre-MMD)

## Where content lives
| Resource | Storage | Format |
|---|---|---|
| Note.content | Postgres `Bytes`, gzip | plain Markdown |
| Reviewer.content | Postgres `Bytes`, gzip | plain Markdown |
| Quiz.questions | Postgres `Json` | Memoria quiz JSON schema (not Markdown) |
| Flashcards | `lib/flashcards.ts` / `lib/flashcards-repo.ts` | derived from Reviewer content, not separately authored Markdown |

Quizzes are out of scope for MMD block syntax (they're structured JSON,
rendered by dedicated quiz components), but quiz `explanation` /
`question` strings are still rendered through `MarkdownRenderer` in a few
places, so the MMD renderer must tolerate being handed a single inline
string, not just a full document.

## Editing
`components/markdown/editor.tsx`: single component, used for both Notes
and Reviewers, both guest and authenticated. Toolbar inserts raw Markdown
via a `transform(selectedText)` pattern into a controlled `<textarea>`;
"Edit"/"Preview" tab toggle; preview renders through `MarkdownRenderer`.
No split/side-by-side mode currently. No slash-command / insert-menu
system currently — this is Milestone 4 territory, additive only.

## Rendering
`components/markdown/renderer.tsx`: `react-markdown` + `remark-gfm`,
no `rehype-raw`. This is the only Markdown renderer in the app. Any MMD
preprocessing must run *before* this (or a replacement) sees the string —
i.e., MMD block syntax (`:::note ... :::`) is not valid CommonMark and
`react-markdown` will currently render it as a literal paragraph
(harmless, but ugly) until the MMD preprocessor exists.

## AI generation of content today
- `lib/prompts/note-prompt.ts` → `buildNoteReformatPrompt()`: instructs
  the model to produce plain GFM Markdown and explicitly says **not** to
  wrap it in a code fence. Used for the note-reformatting-into-reviewer
  workflow (manual copy/paste, no connected provider assumed as default
  path — `buildSourcePackage()` produces a downloadable `.txt` with the
  same instructions appended).
- `lib/prompts/quiz-prompt.ts` → `buildQuizGenerationPrompt()`: instructs
  the model to return **raw JSON, no markdown fences**, matching a
  strict quiz schema. This path does not go through Markdown/MMD at all
  and should not be touched by MMD work except to note the coexistence:
  Memoria has two totally different "AI must return format X" contracts
  today. MMD only changes the note/reviewer contract.
- `lib/ai/providers.ts` → `generateWithProvider()`: thin text-completion
  wrapper for OpenAI/Anthropic/Gemini. Used when the user has connected
  their own API key (`AiConnection` model). Returns a plain string; no
  image generation call exists anywhere in this function or elsewhere in
  the codebase.

## Import
`lib/imports/file-parser.ts` — single entry point for both authenticated
upload and guest stateless extraction:
- `.md`/`.txt`: read as UTF-8, frontmatter recovered via
  `lib/markdown-frontmatter.ts` (title/description extraction).
- `.pdf`: `pdf-parse`, text-only; flags `hasImages` via a regex looking for
  `/Subtype /Image` so the UI can show an "images were skipped" notice.
- `.docx`: `mammoth.extractRawText`, text-only; flags `hasImages` by
  checking for `word/media/` entries in the zip.
- `.json`: recognizes Memoria's own export format
  (`memoria-note-export`/`memoria-reviewer-export`, also tolerates the old
  `memora-` spelling) and otherwise walks arbitrary JSON looking for a
  `content`/`notes`/`body`/`text`/`markdown`/`md` key, joining arrays with
  `\n\n---\n\n`.
- There is currently **no "paste AI response" import path** distinct from
  file upload — pasting is just typing/pasting into the editor textarea.
  **Correction (Milestone 5 pass):** the *reviewer creation* wizards
  (`components/reviewers/reviewer-wizard.tsx` and
  `components/guest/guest-reviewer-flow.tsx`) already have exactly this —
  `stripCodeFences()` in `lib/validation/reviewer.ts`, wired into both the
  wizard's live preview and the `createReviewerSchema`/`updateReviewerSchema`
  Zod transforms. It was missed in the first audit pass because it lives
  in `lib/validation/`, not `lib/imports/`. Verified by hand (see
  conversation history) that its regex — anchored at both start and end
  of the trimmed string — already correctly distinguishes an outer
  wrapper fence from an inner fence that's part of the document (the
  exact worked example from the project brief), and is a safe no-op when
  no fence is present at all. `lib/mmd/ai-instructions.ts` and the
  fence-flip in `lib/prompts/note-prompt.ts` (Milestone 5) reuse this
  existing helper rather than duplicating it. It does NOT cover plain
  Notes (`lib/validation/note.ts` has no such transform) — not a gap,
  since nothing currently pastes raw AI output directly into a Note; the
  reformat workflow always produces a Reviewer.

## Export
- `lib/pdf-export.ts`: `buildMarkdownPdf()` walks the Markdown line by
  line with regex (`^#{1,4}\s`, `^>\s`, `^[-*]\s`, `^\d+\.\s`, GFM table
  rows collected into a buffer and flushed via `jspdf-autotable`). Inline
  emphasis (`**bold**`, `*italic*`, `` `code` ``, links) is stripped to
  plain text via `stripInlineMarkdown`, not styled. No image rendering,
  no diagram rendering — this only handles the seven line-shapes above.
  Anything else (a raw `:::note` line today) falls through to
  `writeParagraph` as plain text.
- `lib/word-export.ts`: same shape, walks lines and maps headings, but
  emits `docx` library `Paragraph`/`TextRun`/`ImageRun` nodes instead of
  drawing PDF text directly. Already knows how to embed an image
  (`ImageRun`, used today only for the brand logo) — this is the piece to
  extend for MMD `:::image`/`:::diagram` blocks rather than build from
  scratch.
- Quiz export (`exportQuizToPdf`) is a separate code path with its own
  question-by-question renderer and a shared `formatCorrectAnswer()`
  helper from `lib/quiz-grading.ts` — not affected by MMD.

## Known compatibility risk for MMD
Both exporters use `/^\|.*\|$/` and heading regexes against raw lines with
**no awareness of fenced code blocks** — a `:::note` line, or a `|` inside
a fenced code block, would currently be misinterpreted by the exporters'
line scanner. The MMD parser must hand the exporters pre-split
non-overlapping "regular Markdown span" vs "MMD block" segments rather
than let the exporters keep doing raw regex-per-line, or MMD blocks will
render as garbled text in exports even after the in-app renderer supports
them correctly.
