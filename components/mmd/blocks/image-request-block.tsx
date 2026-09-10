"use client";
/* eslint-disable @next/next/no-img-element -- authenticated media uses runtime URLs. */

import { useState } from "react";
import Link from "next/link";
import { ImagePlus, Loader2, Upload } from "lucide-react";
import type { MmdBlockNode } from "@/lib/mmd/ast";
import { buildStudyVisualSvg, type StudyVisualTemplate } from "@/lib/svg/templates";
import { useMmdReplacement } from "@/components/mmd/replacement-context";
import { buildMediaImageBlock } from "@/lib/mmd/visuals";

/** A visual request is fulfilled by a user-supplied asset or deterministic
 * SVG template. When rendered in an editable context, fulfillment replaces
 * the request with a persistent media-backed image block. */
export function ImageRequestPlaceholder({ node }: { node: MmdBlockNode }) {
  const { purpose, alt, caption, placement } = node.attrs;
  const replaceBlock = useMmdReplacement();
  const [mediaId, setMediaId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [template, setTemplate] = useState<StudyVisualTemplate>("concept-card");

  async function upload(file: File) {
    setBusy(true);
    setError("");
    const form = new FormData();
    form.append("file", file);
    const response = await fetch("/api/media", { method: "POST", body: form });
    const body = await response.json().catch(() => null);
    if (response.ok && body?.mediaId) {
      setMediaId(body.mediaId);
      if (replaceBlock) {
        replaceBlock(node.raw, buildMediaImageBlock({ mediaId: body.mediaId, alt, caption }));
      }
    } else {
      setError(body?.error ?? "Visual upload failed.");
    }
    setBusy(false);
  }

  async function createSvg() {
    const svg = buildStudyVisualSvg({ title: alt, purpose, template });
    await upload(new File([svg], "memoria-study-visual.svg", { type: "image/svg+xml" }));
  }

  return (
    <figure className="my-4 rounded-lg border border-dashed border-accent/50 bg-accent-soft/20 p-5">
      <div className="flex items-start gap-2.5">
        <ImagePlus className="mt-0.5 h-4 w-4 shrink-0 text-accent-dark" aria-hidden="true" />
        <div className="min-w-0 flex-1 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent-dark">{mediaId ? "Visual attached" : "Visual requested"}</p>
          <p className="mt-1 text-ink">{purpose}</p>
          {mediaId && <figure className="mt-3"><img src={`/api/media/${mediaId}`} alt={alt} loading="lazy" decoding="async" className="max-h-80 rounded-lg border border-line" />{caption && <figcaption className="mt-1 text-xs text-ink-faint">{caption}</figcaption>}</figure>}
          {replaceBlock ? (
            <div data-export-ignore className="mt-3 flex flex-wrap items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-action px-2.5 py-1.5 text-xs font-medium text-action-foreground has-[:disabled]:opacity-60">
                <Upload className="h-3.5 w-3.5" />
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Upload SVG or image"}
                <input type="file" accept="image/svg+xml,image/png,image/jpeg,image/webp" className="sr-only" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); }} />
              </label>
              <select value={template} onChange={(event) => setTemplate(event.target.value as StudyVisualTemplate)} className="h-8 rounded-md border border-line bg-surface px-2 text-xs" disabled={busy} aria-label="SVG template">
                <option value="concept-card">Concept card</option>
                <option value="process-flow">Process flow</option>
                <option value="comparison">Comparison</option>
              </select>
              <button type="button" onClick={() => void createSvg()} disabled={busy} className="inline-flex items-center gap-1.5 rounded-md bg-accent px-2.5 py-1.5 text-xs font-medium text-ink disabled:opacity-60"><ImagePlus className="h-3.5 w-3.5" />Create SVG</button>
              <Link href="/diagrams" className="rounded-md bg-ink/5 px-2.5 py-1.5 text-xs font-medium text-ink hover:bg-ink/10">Open diagram editor</Link>
            </div>
          ) : (
            <p className="mt-3 text-xs text-ink-faint">Open this content in the editor to attach an SVG/image or create a diagram.</p>
          )}
          {error && <p className="mt-2 text-xs text-danger">{error}</p>}
          <dl className="mt-2 space-y-0.5 text-xs text-ink-faint">
            <div><dt className="inline font-medium">Alt text: </dt><dd className="inline">{alt}</dd></div>
            {caption && <div><dt className="inline font-medium">Caption: </dt><dd className="inline">{caption}</dd></div>}
            {placement && <div><dt className="inline font-medium">Placement: </dt><dd className="inline">{placement}</dd></div>}
          </dl>
        </div>
      </div>
    </figure>
  );
}
