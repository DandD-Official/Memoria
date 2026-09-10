import type { MmdNode } from "@/lib/mmd/ast";
import { InlineMarkdown } from "@/components/mmd/inline-markdown";
import { MmdErrorBlock } from "@/components/mmd/blocks/error-block";
import { CalloutBlock } from "@/components/mmd/blocks/callout-block";
import {
  DefinitionBlock,
  ExampleBlock,
  ImportantBlock,
  KeyConceptBlock,
  SummaryBlock,
} from "@/components/mmd/blocks/educational-blocks";
import {
  CardBlock,
  ColumnBlock,
  ColumnsBlock,
  DetailsBlock,
  SectionBlock,
} from "@/components/mmd/blocks/layout-blocks";
import { GalleryBlock, ImageBlock } from "@/components/mmd/blocks/media-blocks";
import { DiagramPlaceholder } from "@/components/mmd/blocks/diagram-block";
import { ImageRequestPlaceholder } from "@/components/mmd/blocks/image-request-block";
import { SvgBlock } from "@/components/mmd/blocks/svg-block";
import { MathBlock } from "@/components/mmd/blocks/math-block";

const CALLOUT_NAMES = new Set(["note", "tip", "warning", "danger", "info", "success"]);

/**
 * Renders a list of MmdNode siblings. This is the single place that maps
 * a block name to its React component — see .context/project-architecture.md
 * for why parsing/rendering dispatch must stay centralized rather than
 * scattered through page components. Adding a new block type means
 * adding it to lib/mmd/spec-blocks.ts AND to the switch below; the
 * default case fails safe (renders as an mmd-error) rather than silently
 * rendering nothing if the two ever drift.
 */
export function MmdNodeList({ nodes }: { nodes: MmdNode[] }) {
  return (
    <>
      {nodes.map((node, i) => (
        <MmdNodeRenderer key={i} node={node} />
      ))}
    </>
  );
}

function MmdNodeRenderer({ node }: { node: MmdNode }) {
  if (node.type === "markdown") return <InlineMarkdown content={node.content} />;
  if (node.type === "mmd-error") return <MmdErrorBlock node={node} />;

  // node.type === "block" from here on.
  if (CALLOUT_NAMES.has(node.block)) {
    return (
      <CalloutBlock node={node}>
        <MmdNodeList nodes={node.children} />
      </CalloutBlock>
    );
  }

  switch (node.block) {
    case "definition":
      return (
        <DefinitionBlock node={node}>
          <MmdNodeList nodes={node.children} />
        </DefinitionBlock>
      );
    case "key-concept":
      return (
        <KeyConceptBlock>
          <MmdNodeList nodes={node.children} />
        </KeyConceptBlock>
      );
    case "example":
      return (
        <ExampleBlock node={node}>
          <MmdNodeList nodes={node.children} />
        </ExampleBlock>
      );
    case "important":
      return (
        <ImportantBlock>
          <MmdNodeList nodes={node.children} />
        </ImportantBlock>
      );
    case "summary":
      return (
        <SummaryBlock>
          <MmdNodeList nodes={node.children} />
        </SummaryBlock>
      );
    case "section":
      return (
        <SectionBlock node={node}>
          <MmdNodeList nodes={node.children} />
        </SectionBlock>
      );
    case "card":
      return (
        <CardBlock node={node}>
          <MmdNodeList nodes={node.children} />
        </CardBlock>
      );
    case "columns":
      return (
        <ColumnsBlock node={node}>
          <MmdNodeList nodes={node.children} />
        </ColumnsBlock>
      );
    case "column":
      return (
        <ColumnBlock>
          <MmdNodeList nodes={node.children} />
        </ColumnBlock>
      );
    case "details":
      return (
        <DetailsBlock node={node}>
          <MmdNodeList nodes={node.children} />
        </DetailsBlock>
      );
    case "image":
      return <ImageBlock node={node} />;
    case "gallery":
      return (
        <>
          <GalleryBlock node={node} />
          {/* Non-image content inside the gallery body (bare Markdown
              images, stray text) still renders normally below the grid. */}
          <MmdNodeList nodes={node.children.filter((c) => c.type !== "block" || c.block !== "image")} />
        </>
      );
    case "diagram":
      return <DiagramPlaceholder node={node} />;
    case "image-request":
      return <ImageRequestPlaceholder node={node} />;
    case "svg":
      return <SvgBlock node={node} />;
    case "math":
      return <MathBlock node={node} />;
    default:
      // Guards against lib/mmd/spec-blocks.ts gaining a block type that
      // nobody wired a renderer for — fails safe instead of rendering
      // nothing (mmd-spec.md §7).
      return (
        <MmdErrorBlock
          node={{ type: "mmd-error", reason: `No renderer registered for block: ${node.block}`, raw: node.raw }}
        />
      );
  }
}
