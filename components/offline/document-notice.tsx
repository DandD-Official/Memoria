"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { offlineCommand, type OfflineDocument } from "@/lib/offline/client";

export function OfflineDocumentNotice({ message, path, title, content, onLoad }: { message: string; path: string; title: string; content: string; onLoad: (document: OfflineDocument) => void }) {
  const [error, setError] = useState("");
  if (!message && !error) return null;
  return <section className="mb-4 space-y-3 rounded-card border border-line-strong bg-surface p-4">
    <p role="status" className="text-sm text-ink-soft">{error || message}</p>
    {message.startsWith("Another device") && <div className="flex flex-wrap gap-2">
      <Button variant="secondary" size="sm" onClick={() => {
        const url = URL.createObjectURL(new Blob([content], { type: "text/markdown;charset=utf-8" }));
        const link = document.createElement("a"); link.href = url; link.download = `${title.replace(/[^a-z0-9 _-]/gi, "_")}-local-draft.md`; link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }}>Download local draft</Button>
      <ConfirmDialog trigger={<Button size="sm" variant="outline">Load online version</Button>} title="Replace this local draft?" description="Download your local draft first. This loads the latest online version; you can then merge your saved draft in the same editor." confirmLabel="Load online version" onConfirm={async () => {
        try {
          const document = await offlineCommand<OfflineDocument>("LOAD_REMOTE", { path });
          onLoad(document); setError("");
          window.dispatchEvent(new CustomEvent("memoria:offline-document", { detail: { ...document, force: true } }));
        } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not load the online version."); throw caught; }
      }} />
    </div>}
  </section>;
}
