"use client";

import { useState } from "react";
import { ImageOff, Maximize2, X } from "lucide-react";
import type { MmdBlockNode, MmdNode } from "@/lib/mmd/ast";
import { cn } from "@/lib/utils";

/**
 * Visual assets may be external URLs or authenticated user-owned media.
 * MMD audit — no Media model, no blob storage integration). `media://`
 * ids therefore cannot be resolved to a real URL today; only external
 * http(s) URLs render. This is intentionally NOT a broken-image state —
 * it's a distinct "not available yet" placeholder so it's never confused
 * with a genuinely missing/deleted image once the media system exists.
 * Revisit once .context/diagram-system.md's "Media abstraction" section
 * is implemented.
 */
function resolveImageSrc(src: string): { url: string } | { unresolved: true } {
  if (src.startsWith("http://") || src.startsWith("https://")) return { url: src };
  if (src.startsWith("media://")) return { url: `/api/media/${encodeURIComponent(src.slice("media://".length))}` };
  return { unresolved: true };
}

const SIZE_CLASS: Record<string, string> = {
  small: "max-w-xs",
  medium: "max-w-md",
  large: "max-w-2xl",
  full: "max-w-full",
};

const ALIGN_CLASS: Record<string, string> = {
  left: "mr-auto",
  center: "mx-auto",
  right: "ml-auto",
};

function UnresolvedImage({ alt, caption }: { alt: string; caption?: string }) {
  return (
    <figure className="my-4 flex flex-col items-center rounded-lg border border-dashed border-line bg-ink/[0.02] p-6 text-center">
      <ImageOff className="h-6 w-6 text-ink-faint" aria-hidden="true" />
      <p className="mt-2 text-sm text-ink-soft">Image storage isn&apos;t set up yet.</p>
      <p className="mt-0.5 text-xs text-ink-faint">{alt}</p>
      {caption && <figcaption className="mt-1 text-xs text-ink-faint">{caption}</figcaption>}
    </figure>
  );
}

/** :::image{src="..." alt="..." caption="..." align="..." size="..."} */
export function ImageBlock({ node }: { node: MmdBlockNode }) {
  const { src, alt, caption, align = "center", size = "medium" } = node.attrs;
  const resolved = resolveImageSrc(src);
  const [open, setOpen] = useState(false);

  if ("unresolved" in resolved) return <UnresolvedImage alt={alt} caption={caption} />;

  return (
    <>
      <figure
        className={cn("my-4", SIZE_CLASS[size] ?? SIZE_CLASS.medium, ALIGN_CLASS[align] ?? ALIGN_CLASS.center)}
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="block w-full cursor-zoom-in overflow-hidden rounded-lg border border-line"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- external/unknown-origin MMD image URLs, not part of the Next.js image pipeline */}
          <img src={resolved.url} alt={alt} loading="lazy" decoding="async" className="w-full" />
        </button>
        {caption && <figcaption className="mt-1.5 text-center text-xs text-ink-soft">{caption}</figcaption>}
      </figure>
      {open && <GalleryLightbox image={{ src, alt, caption }} onClose={() => setOpen(false)} />}
    </>
  );
}

interface GalleryImage {
  src: string;
  alt: string;
  caption?: string;
}

function extractGalleryImages(children: MmdNode[]): GalleryImage[] {
  const images: GalleryImage[] = [];
  for (const child of children) {
    if (child.type === "block" && child.block === "image") {
      images.push({ src: child.attrs.src, alt: child.attrs.alt, caption: child.attrs.caption });
    }
    // Bare `![alt](src)` Markdown images inside a gallery are intentionally
    // left to InlineMarkdown's normal <img> rendering (mmd-spec.md §4) —
    // extracting them here as well would render every bare image twice.
  }
  return images;
}

/** :::gallery — a responsive grid of :::image blocks with a click-to-enlarge
 * lightbox. Bare Markdown images and any other body text render normally
 * via InlineMarkdown alongside the grid (handled by the caller). */
export function GalleryBlock({ node }: { node: MmdBlockNode }) {
  const images = extractGalleryImages(node.children);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (images.length === 0) return null;

  return (
    <>
      <div className="my-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {images.map((img, i) => {
          const resolved = resolveImageSrc(img.src);
          if ("unresolved" in resolved) {
            return <UnresolvedImage key={i} alt={img.alt} caption={img.caption} />;
          }
          return (
            <button
              key={i}
              type="button"
              onClick={() => setOpenIndex(i)}
              className="group relative aspect-square overflow-hidden rounded-lg border border-line"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={resolved.url} alt={img.alt} loading="lazy" decoding="async" className="h-full w-full object-cover" />
              <span className="absolute inset-0 flex items-center justify-center bg-ink/0 opacity-0 transition group-hover:bg-ink/20 group-hover:opacity-100">
                <Maximize2 className="h-5 w-5 text-white" aria-hidden="true" />
              </span>
            </button>
          );
        })}
      </div>

      {openIndex !== null && (
        <GalleryLightbox image={images[openIndex]} onClose={() => setOpenIndex(null)} />
      )}
    </>
  );
}

function GalleryLightbox({ image, onClose }: { image: GalleryImage; onClose: () => void }) {
  const resolved = resolveImageSrc(image.src);
  if ("unresolved" in resolved) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={image.alt}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-4"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 rounded-full bg-surface/10 p-2 text-white hover:bg-surface/20"
      >
        <X className="h-5 w-5" aria-hidden="true" />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={resolved.url}
        alt={image.alt}
        decoding="async"
        className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
