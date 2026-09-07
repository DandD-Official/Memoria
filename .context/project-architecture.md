# Memoria — Project Architecture

## Stack and boundaries

Memoria uses Next.js 15, React 18, TypeScript, Tailwind, Prisma 5, Postgres,
and NextAuth. Content routes are wrapped with `withApiErrorHandling`.
Guest mode is stateless and does not write diagrams or media.

Notes and reviewers store gzip-compressed Markdown. Quizzes store validated
JSON. `components/markdown/renderer.tsx` is the compatibility wrapper around
the centralized MMD parser/renderer, so raw HTML remains literal text and is
never passed through `rehype-raw`.

## MMD pipeline

```text
source → parseMmd() → MMD AST → renderer/editor/exporters
                         ├→ diagram references → Diagram API/preview
                         └→ image references → Media API/authenticated bytes
```

The parser, block schema, AI instruction generator, renderer, editor insert
menu, and exporters share `lib/mmd/spec-blocks.ts` as their block contract.

## Visual system

There are three visual paths:

- `:::diagram{id="..."}` points to a DB-backed diagram edited at `/diagrams`.
- `:::image{src="media://..." alt="..."}` points to an authenticated,
  user-uploaded SVG, PNG, JPEG, or WebP stored in `Media`.
- `:::image{src="https://..." alt="..."}` points to a real external asset.

MMD accepts SVGs as image assets; it does not execute inline raw SVG/HTML.
Uploaded SVGs are size-limited and rejected when they contain scripts,
event-handler attributes, `javascript:` URLs, or `foreignObject`.

AI providers are text-only. Their user-configured API keys are used only for
text generation. There is no image-generation provider integration.

## Persistence

`lib/diagrams/schema.ts` is the versioned source of truth for diagram JSON.
`lib/diagrams/repo.ts` owns diagram reads/writes and preview snapshots.
`lib/media/repo.ts` owns user media bytes. Both are owner-scoped through the
API and use Postgres `Bytes` for the current small-asset implementation.

## Guest mode

Guest MMD rendering works without DB access. Guest users can see image-request
intent and external assets, but diagram editing and media uploads require an
authenticated owner and are unavailable in guest mode.
