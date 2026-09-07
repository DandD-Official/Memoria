import { ImagePlus } from "lucide-react";
import type { MmdBlockNode } from "@/lib/mmd/ast";

/**
 * :::image-request{purpose="..." alt="..." caption="..." placement="..."}
 *
 * Emitted by an AI when it wants an image but couldn't return one Memoria
 * can store (no connected provider, or the provider can't do image
 * generation). This must render as a visually and semantically DISTINCT
 * "pending" state — never styled or announced as if a real image exists
 * (mmd-spec.md §4, project brief Milestone 6).
 *
 * "Generate image" / "Upload" / "Replace" / "Remove" actions are
 * intentionally NOT wired up here yet — the underlying capability
 * (media storage, and for generation, an actual image-generation call in
 * lib/ai/providers.ts) doesn't exist yet (see .context/milestones.md,
 * Milestone 6). Rendering inert-looking buttons that don't do anything
 * would be its own kind of fake affordance, so this stays informational
 * until that infrastructure lands.
 */
export function ImageRequestPlaceholder({ node }: { node: MmdBlockNode }) {
  const { purpose, alt, caption, placement } = node.attrs;
  return (
    <figure className="my-4 rounded-lg border border-dashed border-accent/50 bg-accent-soft/20 p-5">
      <div className="flex items-start gap-2.5">
        <ImagePlus className="mt-0.5 h-4 w-4 shrink-0 text-accent-dark" aria-hidden="true" />
        <div className="min-w-0 flex-1 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent-dark">
            Image pending
          </p>
          <p className="mt-1 text-ink">{purpose}</p>
          <dl className="mt-2 space-y-0.5 text-xs text-ink-faint">
            <div>
              <dt className="inline font-medium">Alt text: </dt>
              <dd className="inline">{alt}</dd>
            </div>
            {caption && (
              <div>
                <dt className="inline font-medium">Caption: </dt>
                <dd className="inline">{caption}</dd>
              </div>
            )}
            {placement && (
              <div>
                <dt className="inline font-medium">Placement: </dt>
                <dd className="inline">{placement}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    </figure>
  );
}
