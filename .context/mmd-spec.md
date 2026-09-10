# Memoria Markdown (MMD) — Specification v1

Status: DRAFT — not yet implemented. This is the source of truth. The
parser, the editor insert menu, and the AI prompt instructions must all be
generated from (or checked against) this document, never drift
independently. See `ai-content-generation.md` for how the AI prompt is
kept in sync.

## 1. Design goals
- MMD is standard GitHub-flavored Markdown plus a small set of
  **fenced custom blocks**. Nothing that isn't inside a custom block is
  anything other than ordinary Markdown.
- 100% of existing Note/Reviewer content is already valid MMD (no
  migration needed).
- No raw HTML outside the explicit `:::svg` visual block. No block attribute is executable.
- Deterministic: a given source string parses to exactly one block tree,
  regardless of surrounding content.
- Fails safe: unknown/malformed blocks degrade to a visible, non-crashing
  placeholder — they never delete content or throw.

## 2. Block syntax
```
:::blockname{attr="value" attr2="value2"}
content (Markdown + nested MMD allowed unless noted otherwise)
:::
```

Rules:
- Opening fence: `:::` + block name (`[a-z][a-z0-9-]*`), optionally
  followed by `{...}` attributes, then end of line.
- Attributes are `key="value"` pairs, double-quoted, space-separated,
  order-independent. No unquoted values, no boolean shorthand — keeps the
  grammar trivial to parse and to validate against a schema per block.
- Closing fence: a line containing exactly `:::` (no trailing content).
- A block with no attributes omits `{}` entirely: `:::note` not
  `:::note{}`.
- Blocks with no body use a self-closing empty body between the fences
  (`:::image{...}\n:::`) — there is no separate self-closing syntax, to
  keep exactly one grammar rule for "block."
- Nesting: a block's body may contain other MMD blocks **one level deep**
  only, except `:::section` and `:::columns`/`:::column`, which may
  contain any other block type (including each other) up to a hard depth
  limit of 4. This bounds worst-case recursive-parser and renderer cost
  and keeps deeply nested content from becoming fragile, per the brief.
- Unterminated blocks (no matching `:::`) are a parse error for that
  block only — see §7 fallback behavior. They never consume the rest of
  the document.

## 3. MMD version marker
Documents do not require a version marker (backward compatibility with
plain Markdown is mandatory). An MMD parser output object always carries
`mmdVersion: 1` so future parser versions can special-case old output if
the grammar ever changes. There is no in-document `<!-- mmd:v1 -->`
marker in v1 — added only if/when v2 introduces a breaking change.

## 4. Supported block types (v1 production set)

### Callouts
`:::note`, `:::tip`, `:::warning`, `:::danger`, `:::info`, `:::success`
- Attributes: `title` (optional, string).
- Body: Markdown + nested callouts/definitions/examples one level deep.

### Educational blocks
- `:::definition{term="..."}` — `term` **required**.
- `:::key-concept` — no required attributes.
- `:::example{title="..."}` — `title` optional.
- `:::important` — no required attributes.
- `:::summary` — no required attributes.

### Math
- `:::math{formula="..."}` — renders a safe LaTeX-style mathematical
  expression such as `\\rightarrow` as a readable symbol. Inline `$...$`
  notation is also recognized by the Markdown renderer and uses the same
  safe symbol mapping. This is not a general TeX/HTML execution surface.

### Layout
- `:::section{title="..." subtitle="..."}` — `title` required, `subtitle`
  optional. May contain any block type, depth ≤ 4.
- `:::card{title="..." subtitle="..." icon="..." type="..."}` — all
  attributes optional. `type` is a closed enum (`default`, `outline`,
  `highlight`) purely for visual variant — no behavioral effect, to obey
  "only attributes with a real implementation purpose."
- `:::columns` containing exactly `:::column` children (2–3 columns);
  anything else inside `:::columns` other than `:::column` blocks and
  whitespace is a validation error for that block (falls back per §7).
- `:::details{title="..."}` — `title` optional (defaults to "Details").
  Renders as a native `<details>`/`<summary>` pair for built-in keyboard
  accessibility. PDF/DOCX export renders it **expanded**, with a small
  "(expandable in-app)" caption, per the brief's fallback rule.

### Media
- Standard `![alt](src)` Markdown images continue to work unchanged.
- `:::image{src="..." alt="..." caption="..." align="..." size="..."}` —
  `src` and `alt` **required** (alt text is not optional — accessibility
  rule). `caption` optional. `align` ∈ `left|center|right` (default
  `center`). `size` ∈ `small|medium|large|full` (default `medium`) —
  named sizes, not arbitrary pixel/CSS values, so exports have a bounded
  set of layouts to implement.
  `src` must resolve through the media abstraction (see
  `diagram-system.md` §"Media abstraction") — internal storage id
  (`media://<id>`), or an external `https://` URL if the existing
  security/URL-allowlist model permits external images. Never `data:` or
  `javascript:` URLs — reject at parse/validation time.
- `:::gallery` containing only standard `![alt](src)` image lines (one per
  line) or `:::image` blocks. Renders as a responsive grid with lightbox.

### Diagrams
- `:::diagram{id="..." caption="..."}` — `id` **required**, references a
  diagram stored separately (see `diagram-system.md`). This block never
  carries diagram JSON inline — keeps documents small and diagrams
  independently editable/shareable. `caption` optional.

### AI image placeholder (not a real image — see `ai-content-generation.md`)
- `:::image-request{purpose="..." alt="..." caption="..." placement="..."}`
  — `purpose` and `alt` **required**. This block type must never be
  treated as if it displays a real image; the renderer shows a distinct
  "pending image" UI, and the exporters must render it as a labeled
  placeholder, not skip it silently and not render a broken image.

### Inline AI SVG visual
- `:::svg{alt="..." caption="..." align="..." size="..."}` — renders one
  self-contained SVG supplied in the block body. `alt` is required;
  `caption`, `align`, and `size` are optional and use the same bounded values
  as `:::image`. This is the one MMD block where SVG markup is allowed.
  Before rendering, Memoria reconstructs the SVG from a strict element and
  attribute allowlist. Scripts, event handlers, external URLs, styles,
  `foreignObject`, and other embedded HTML are rejected.

## 5. Attribute validation
Every block type above has a fixed attribute allowlist (name + type +
required/optional), defined once in `lib/mmd/spec-blocks.ts` (planned) and
enforced by Zod. Rules applied to every attribute value regardless of
block:
- Max length 500 chars (title/caption/alt/purpose/term fields).
- No `<`, `>`, or `javascript:`/`data:` substrings — belt-and-suspenders
  even though the renderer never interprets attributes as HTML.
- Unknown attributes on a known block: dropped with a non-fatal warning
  (editor-mode only), not a parse failure — an AI or user adding a plausible
  but unsupported attribute (e.g. `color="red"` on `:::note`) should not
  break the whole block.

## 6. Nesting rules (summary table)
| Block | Can contain |
|---|---|
| note/tip/warning/danger/info/success | Markdown, definition, key-concept, example, important, summary (1 level) |
| definition/key-concept/example/important/summary | Markdown only (no nested custom blocks) |
| section | any block, depth ≤ 4 |
| card | Markdown, callouts, definition/example (1 level) |
| columns | column (only) |
| column | any block except columns (depth ≤ 4, shares section's limit) |
| details | any block, depth ≤ 4 |
| gallery | image blocks / bare image syntax only |
| image, image-request, diagram | no body (empty between fences) |
| svg | one self-contained SVG body; no nested MMD blocks |

## 7. Malformed input / fallback behavior
The parser never throws for malformed MMD; it always returns a full block
tree, with problem spots represented as `{ type: "mmd-error", raw, reason }`
nodes. Rendering rules for `mmd-error` nodes:
- **In-app preview / reader view**: render the original raw fenced text
  as a plain, visually distinct "unsupported content" block with the
  reason shown (e.g. "Unknown block type: foo", "Missing closing marker
  for warning"), never dropped.
- **Editor mode**: same, plus the error surfaces in the editor's inline
  diagnostics (Milestone 15) so the user can fix it in place.
- **Export (PDF/DOCX)**: render the raw source text as a monospace/plain
  paragraph rather than omitting it — export must never silently lose
  content that the in-app preview still shows.
Concrete failure cases and required behavior:
- Unknown block name → `mmd-error`, reason "Unknown block type: X".
- Missing closing `:::` → `mmd-error` spanning to end of document *for
  that block only* if no closing fence is ever found; if a later `:::`
  belonging to a different, correctly-opened block would be consumed
  first, the parser must not swallow it — this is why the parser tracks
  an explicit stack rather than doing a single global regex pass.
- Required attribute missing (e.g. `:::definition` with no `term`) →
  `mmd-error`, reason names the missing attribute; body content is still
  preserved in the raw text shown.
- `:::diagram{id="x"}` where `x` doesn't resolve → not a parse error (the
  syntax is valid) — this is a **render-time** "broken reference" state,
  shown as a distinct "Diagram not found" placeholder, edit-safe (does not
  rewrite the document).

## 8. Backward compatibility
- Any document containing zero `:::` fences parses identically to plain
  Markdown today (the parser is a strict superset).
- A `:::` fence that isn't followed by a valid block name on the same line
  (e.g. someone typed `:::` as a literal horizontal-rule-like separator)
  is **not** treated as an MMD block open — passed through to the
  Markdown renderer untouched. Only `:::<name>` (name matching the block
  grammar) triggers MMD parsing. This avoids breaking any existing
  document that happens to contain a bare `:::` line.

## 9. Versioning policy
`MMD_VERSION = 1`, exported from `lib/mmd/spec-blocks.ts`. A future
breaking change bumps to 2 and the parser must still read v1 documents
(v1 is a subset of any future version — only additive changes are
"breaking-free"; anything that would change v1 semantics requires a
compatibility shim, not a silent behavior change).

## 10. Explicitly out of scope for v1
- Arbitrary CSS/inline styling attributes.
- User-defined block types.
- Executable content of any kind.
- Pixel-precise column widths (columns are 2 or 3 equal-width only).
