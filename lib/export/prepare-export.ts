import type { MmdAssetRegistry } from "@/lib/export/asset-registry";

const MAX_ASSET_WAIT_MS = 30_000;
const MAX_EMBEDDED_IMAGE_BYTES = 10 * 1024 * 1024;
const IMAGE_MIME_RE = /^image\/(?:avif|bmp|gif|jpeg|png|svg\+xml|webp)$/i;

export interface PreparedMmdExport {
  /** Images that could not be embedded while preparing the isolated surface. */
  failedAssets: string[];
  /** Restores any source attributes changed during normalization. */
  cleanup: () => void;
}

export interface PrepareMmdForExportOptions {
  assetRegistry?: MmdAssetRegistry;
  fetchImpl?: typeof fetch;
}

function nextFrame(): Promise<void> {
  if (typeof window === "undefined" || typeof window.requestAnimationFrame !== "function") {
    return Promise.resolve();
  }
  return new Promise((resolve) => window.requestAnimationFrame(() => resolve()));
}

async function waitForFonts(): Promise<void> {
  if (typeof document === "undefined" || !document.fonts?.ready) return;
  await document.fonts.ready;
}

async function waitForRenderState(root: HTMLElement, assetRegistry?: MmdAssetRegistry): Promise<void> {
  await nextFrame();
  await assetRegistry?.waitUntilSettled();

  if (!root.querySelector('[data-mmd-asset-state="loading"]')) return;
  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      observer.disconnect();
      window.clearTimeout(timeout);
      if (error) reject(error);
      else resolve();
    };
    const check = () => {
      if (!root.querySelector('[data-mmd-asset-state="loading"]')) finish();
    };
    const observer = new MutationObserver(check);
    observer.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-mmd-asset-state"] });
    const timeout = window.setTimeout(() => {
      const pending = assetRegistry?.pendingKeys().join(", ");
      finish(new Error(`MMD export assets did not resolve before the timeout${pending ? `: ${pending}` : "."}`));
    }, MAX_ASSET_WAIT_MS);
    check();
  });
}

function isFetchableImageSource(source: string): boolean {
  try {
    const url = new URL(source, document.baseURI);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isSameOrigin(source: string): boolean {
  try {
    return new URL(source, document.baseURI).origin === window.location.origin;
  } catch {
    return false;
  }
}

function blobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read image bytes."));
    reader.readAsDataURL(blob);
  });
}

async function fetchImageAsDataUrl(source: string, fetchImpl: typeof fetch): Promise<string> {
  const url = new URL(source, document.baseURI);
  const sameOrigin = isSameOrigin(source);
  const response = await fetchImpl(url.href, {
    cache: "force-cache",
    credentials: sameOrigin ? "include" : "omit",
    mode: sameOrigin ? "same-origin" : "cors",
  });
  if (!response.ok) throw new Error(`Image request failed with HTTP ${response.status}.`);

  const contentType = response.headers.get("content-type")?.split(";", 1)[0]?.trim() || "";
  if (!IMAGE_MIME_RE.test(contentType)) throw new Error("Image response had an unsupported MIME type.");

  const blob = await response.blob();
  if (blob.size > MAX_EMBEDDED_IMAGE_BYTES) throw new Error("Image exceeds the export size limit.");
  if (!IMAGE_MIME_RE.test(blob.type || contentType)) throw new Error("Image bytes had an unsupported MIME type.");
  return blobAsDataUrl(blob);
}

function waitForImage(image: HTMLImageElement): Promise<void> {
  if (image.complete) {
    return image.naturalWidth > 0 ? Promise.resolve() : Promise.reject(new Error("Image failed to load."));
  }
  return new Promise((resolve, reject) => {
    const onLoad = () => { cleanup(); resolve(); };
    const onError = () => { cleanup(); reject(new Error("Image failed to load.")); };
    const cleanup = () => {
      image.removeEventListener("load", onLoad);
      image.removeEventListener("error", onError);
    };
    image.addEventListener("load", onLoad, { once: true });
    image.addEventListener("error", onError, { once: true });
  });
}

async function prepareImages(root: HTMLElement, fetchImpl: typeof fetch): Promise<{ failedAssets: string[]; cleanup: () => void }> {
  const failedAssets: string[] = [];
  const restores: Array<() => void> = [];
  const images = [...root.querySelectorAll("img")];

  await Promise.all(images.map(async (image) => {
    const source = image.getAttribute("src") ?? "";
    if (!source) return;

    if (isFetchableImageSource(source)) {
      try {
        const embedded = await fetchImageAsDataUrl(source, fetchImpl);
        image.setAttribute("src", embedded);
        restores.push(() => image.setAttribute("src", source));
      } catch {
        failedAssets.push(source);
      }
    }

    try {
      await image.decode?.();
      await waitForImage(image);
    } catch {
      failedAssets.push(source);
    }
  }));

  return {
    failedAssets: [...new Set(failedAssets)],
    cleanup: () => restores.forEach((restore) => restore()),
  };
}

/**
 * Prepares an isolated MmdExportSurface for capture. This function never
 * changes the live preview: callers pass the detached/off-screen export root.
 */
export async function prepareMmdForExport(
  root: HTMLElement,
  options: PrepareMmdForExportOptions = {}
): Promise<PreparedMmdExport> {
  await waitForFonts();
  await waitForRenderState(root, options.assetRegistry);
  const prepared = await prepareImages(root, options.fetchImpl ?? window.fetch.bind(window));
  await nextFrame();

  // Inline SVG—including Lucide/component icons and sanitized :::svg
  // visuals—stays in the DOM. Marking it makes future page-capture backends
  // explicit about preserving the vector source instead of treating it as
  // disposable web UI.
  root.querySelectorAll("svg").forEach((svg) => svg.setAttribute("data-export-svg", "true"));

  return prepared;
}
