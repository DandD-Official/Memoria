# Memoria — Project Architecture (baseline audit, MMD project start)

Audited from the zip provided 2026-09-06. This file describes the system
**as it exists today**, before any MMD work. Update it as MMD lands.

## Stack
- Next.js 15 (App Router), React 18, TypeScript, Tailwind (hardcoded colors,
  no CSS-variable theming — dark theme was tried and fully reverted).
- Prisma 5 / Postgres. Content-bearing tables (`Note.content`,
  `Reviewer.content`) store **gzip-compressed Markdown** as `Bytes`
  (`lib/compression.ts`), hydrated to plain strings by `lib/notes-repo.ts`
  / `lib/reviewers-repo.ts`. Nothing outside those two repos should touch
  `prisma.note`/`prisma.reviewer` `content` directly.
- `Quiz.questions` / `Quiz.configuration` are Prisma `Json` columns (not
  compressed), validated against `lib/validation/quiz.ts`.
- Auth: NextAuth. Guest mode is fully separate — stateless, no DB writes,
  lives under `app/guest/` + `components/guest/`.
- Every API route is wrapped in `withApiErrorHandling`
  (`lib/api/handler.ts`) so failures always return JSON.

## Content pipeline today (pre-MMD)
```
Source (typed / imported / AI) → plain GitHub-flavored Markdown string
      → stored as gzip Bytes (Note/Reviewer) or Json (Quiz questions)
      → components/markdown/renderer.tsx → ReactMarkdown + remark-gfm
      → components/markdown/editor.tsx → textarea + toolbar + live preview
      → lib/pdf-export.ts / lib/word-export.ts → hand-rolled line-by-line
        Markdown-to-PDF/DOCX renderers (headings, bold/italic stripped to
        plain text, lists, blockquotes, GFM tables). No image/diagram
        support in either exporter.
```

Key point: **there is exactly one Markdown renderer and one editor
component** shared by notes and reviewers (guest and authenticated both use
`MarkdownRenderer`). This is the correct single integration point for MMD —
do not fork it.

`components/markdown/renderer.tsx` deliberately skips `rehype-raw`, so raw
HTML in content renders as literal text rather than executing. **This is
the app's entire XSS defense for user/AI content today.** Any MMD parser
must preserve this property (no raw HTML pass-through) rather than relying
on sanitization added later.

## What does NOT exist yet (confirmed by reading package.json + schema.prisma)
- No diagram/canvas library (no reactflow, konva, fabric, excalidraw, etc.)
- No media/image storage model in Prisma (no `Media`, `Attachment`, `Image`
  model) and no upload/blob-storage integration (no S3/Cloudinary/etc. in
  `lib/integrations/`).
- No AI image-generation call anywhere — `lib/ai/providers.ts` only makes
  text completion calls to OpenAI/Anthropic/Gemini (`generateWithProvider`
  returns a string). Scenario A of the MMD image spec (auto image gen via a
  connected provider) has **zero existing plumbing** to build on.
- AI prompts (`lib/prompts/note-prompt.ts`, `lib/prompts/quiz-prompt.ts`)
  currently explicitly tell the model **not** to wrap output in a code
  fence for notes/reviewers ("do NOT wrap the whole thing in a \`\`\`markdown
  code fence"), and quiz generation returns raw JSON, not Markdown. This is
  the opposite of the MMD spec's "always wrap in exactly one outer fence"
  requirement — the prompts and the paste/import handling both need
  updating together, or a paste that used to work will break.
- No import/paste-fence-stripping logic today. `lib/imports/file-parser.ts`
  handles file uploads (.md/.txt/.pdf/.docx/.json) but there is no
  "paste AI response" flow that strips an outer fence.

## Existing infra directly reusable for MMD
- `lib/imports/file-parser.ts` — generic JSON import + frontmatter recovery;
  the outer-fence-stripping logic for pasted AI output belongs here or in a
  sibling module, not duplicated.
- `lib/validation/` (Zod schemas already used for quiz/note/reviewer/auth) —
  MMD attribute/block validation should follow this existing pattern.
- `lib/quiz-grading.ts`'s `formatCorrectAnswer()` — precedent for "single
  shared helper used by both in-app rendering and export" that MMD's own
  parser must follow (one parser, consumed by renderer + both exporters).
- `withApiErrorHandling` — any new diagram-save / image-upload API routes
  should use this wrapper like every other route.

## Guest mode parity requirement
Guest mode (`components/guest/*`) already supports all study types
(quiz, reviewer, flashcards) via prompt-generation or JSON import, with no
DB persistence. MMD rendering must work in guest mode via the same
`MarkdownRenderer` (no DB dependency) — but diagram *editing/saving* is
DB-backed (diagrams need stable IDs per Milestone 3), so guest mode will
need either (a) in-memory-only diagrams that don't survive reload, or
(b) diagrams excluded from guest mode initially. This needs an explicit
decision — see `milestones.md`.

## Where MMD code should live (proposed, not yet created)
```
lib/mmd/
  spec-blocks.ts       // single source of truth: block names, attrs, schema
  parser.ts            // Markdown+MMD source -> structured block tree
  ast.ts                // TypeScript types for the block tree
  ai-instructions.ts    // generates the AI prompt block from spec-blocks.ts
                        // (implemented — see .context/ai-content-generation.md;
                        // outer-fence stripping reuses the existing
                        // lib/validation/reviewer.ts stripCodeFences()
                        // rather than a separate lib/mmd/paste-import.ts)
components/mmd/
  renderer.tsx          // block tree -> React components (replaces/wraps
                         // components/markdown/renderer.tsx)
  blocks/               // one component per block type (Callout, Card, ...)
  editor/                // insert-menu, split view (extends
                         // components/markdown/editor.tsx)
  diagram/               // diagram editor + embed/resolve components
lib/diagrams/
  schema.ts              // versioned Zod schema for diagram JSON
  repo.ts                 // CRUD, following notes-repo.ts pattern
```

This keeps parsing centralized (per the project brief's architectural
rule) and lets `components/markdown/renderer.tsx` become a thin wrapper
around `components/mmd/renderer.tsx` rather than being replaced outright,
so nothing importing the old path breaks.
