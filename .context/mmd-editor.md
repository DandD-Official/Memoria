# Memoria Markdown Editor — Quick Context

## How blocks close

Every MMD block opens with a named line and closes with a bare `:::` line.
The closing line always belongs to the most recently opened block.

```markdown
:::section{title="Networking"}
Intro text.

:::note
Remember this.
:::

More section text.
:::
```

The editor's **MMD block map** shows this as:

```text
L1 :::section → closes L9
  L4 :::note → closes L6
```

An unclosed block is shown in red as `unclosed`. Click any map entry to jump
to its opening line.

## Visual blocks

```markdown
:::diagram{id="saved-diagram-id" caption="Network flow"}
:::

:::image{src="media://uploaded-asset-id" alt="Network flow diagram"}
:::

:::image-request{purpose="Show the network flow" alt="Network flow diagram"}
:::
```

`image-request` is editable intent. In an authenticated editor preview, it
can be replaced by an uploaded SVG/image or a safe SVG template. Raw inline
HTML/SVG is not executed; SVGs are stored and referenced as image assets.

## Where the implementation lives

- `components/markdown/editor.tsx` — shared note/reviewer editor.
- `components/mmd/editor/insert-menu.tsx` — categorized block insertion.
- `components/mmd/editor/block-map.tsx` — opening/closing line map.
- `lib/mmd/parser.ts` — authoritative MMD parser.
- `lib/mmd/spec-blocks.ts` — supported blocks and attributes.
- `lib/mmd/editor-templates.ts` — insertion templates.
- `lib/mmd/ai-instructions.ts` — synchronized AI output rules.
