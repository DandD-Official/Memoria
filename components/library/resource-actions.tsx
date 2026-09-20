"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, Copy, MoreHorizontal, Star, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";

type ResourceType = "NOTE" | "REVIEWER" | "QUIZ";

export function ResourceActions({ resourceType, resourceId, archived, favorite }: { resourceType: ResourceType; resourceId: string; archived: boolean; favorite: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function act(action: "archive" | "restore" | "favorite" | "unfavorite" | "duplicate") {
    setBusy(action);
    setError(null);
    try {
      const response = await fetch("/api/library", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resourceType, resourceIds: [resourceId], action }) });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "Could not complete that action.");
      if (action === "duplicate" && data?.created?.id) router.push(resourcePath(resourceType, data.created.id));
      else router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not complete that action.");
    } finally {
      setBusy(null);
    }
  }
  return <div className="flex flex-wrap items-center gap-1">{error && <span role="alert" className="order-last basis-full text-xs text-danger">{error}</span>}<Button variant="ghost" size="sm" loading={busy === (favorite ? "unfavorite" : "favorite")} onClick={() => act(favorite ? "unfavorite" : "favorite")}><Star className={`h-3.5 w-3.5 ${favorite ? "fill-accent text-accent-dark" : ""}`} /> {favorite ? "Starred" : "Favorite"}</Button><Button variant="ghost" size="sm" loading={busy === "duplicate"} onClick={() => act("duplicate")}><Copy className="h-3.5 w-3.5" /> Duplicate</Button><Button variant="ghost" size="sm" loading={busy === (archived ? "restore" : "archive")} onClick={() => act(archived ? "restore" : "archive")}>{archived ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />} {archived ? "Restore" : "Archive"}</Button></div>;
}

function resourcePath(resourceType: ResourceType, resourceId: string) {
  const collection = resourceType === "NOTE" ? "notes" : resourceType === "REVIEWER" ? "reviewers" : "quizzes";
  return `/${collection}/${resourceId}`;
}

export function ResourceFavoriteButton({ resourceType, resourceId, favorite }: { resourceType: ResourceType; resourceId: string; favorite: boolean }) {
  const router = useRouter();
  const [isFavorite, setIsFavorite] = useState(favorite);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    const next = !isFavorite;
    setIsFavorite(next);
    setError(null);
    setBusy(true);
    try {
      const response = await fetch("/api/library", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resourceType, resourceIds: [resourceId], action: next ? "favorite" : "unfavorite" }) });
      if (!response.ok) throw new Error("Could not update favorite.");
      router.refresh();
    } catch (caught) {
      setIsFavorite(!next);
      setError(caught instanceof Error ? caught.message : "Could not update favorite.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative">
      <Button variant="ghost" size="sm" loading={busy} aria-pressed={isFavorite} aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"} onClick={toggle}>
        <Star className={`h-3.5 w-3.5 ${isFavorite ? "fill-accent text-accent-dark" : ""}`} />
        <span className="hidden sm:inline">{isFavorite ? "Starred" : "Favorite"}</span>
      </Button>
      {error && <span role="status" className="absolute right-0 top-10 z-10 w-48 rounded-control border border-danger/30 bg-surface-raised p-2 text-xs text-danger shadow-card">{error}</span>}
    </div>
  );
}

export function ResourceUtilityActions({ resourceType, resourceId, archived }: { resourceType: ResourceType; resourceId: string; archived: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(action: "archive" | "restore" | "duplicate") {
    setBusy(action);
    setError(null);
    try {
      const response = await fetch("/api/library", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resourceType, resourceIds: [resourceId], action }) });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "Could not complete that action.");
      if (action === "duplicate" && data?.created?.id) router.push(resourcePath(resourceType, data.created.id));
      else router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not complete that action.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-1">
      <Button variant="ghost" size="sm" loading={busy === "duplicate"} onClick={() => act("duplicate")}><Copy className="h-3.5 w-3.5" /> Duplicate</Button>
      <Button variant="ghost" size="sm" loading={busy === (archived ? "restore" : "archive")} onClick={() => act(archived ? "restore" : "archive")}>
        {archived ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />} {archived ? "Restore" : "Archive"}
      </Button>
      {error && <p role="alert" className="px-2 py-1 text-xs text-danger">{error}</p>}
    </div>
  );
}

export function ResourceDetailActions({ edit, study, favorite, share, tools, exportAction }: { edit?: ReactNode; study: ReactNode; favorite: ReactNode; share?: ReactNode; tools: ReactNode; exportAction?: ReactNode }) {
  const [studyOpen, setStudyOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  return <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-surface p-2" aria-label="Document actions">
    <div className="flex flex-wrap items-center gap-2">{edit}<Button variant="secondary" size="sm" onClick={() => setStudyOpen(true)}><Sparkles className="h-4 w-4" /> Study</Button></div>
    <div className="flex flex-wrap items-center gap-2">{exportAction}{share}<Button variant="ghost" size="sm" onClick={() => setToolsOpen(true)}><MoreHorizontal className="h-4 w-4" /> More</Button></div>
    <Sheet open={studyOpen} onOpenChange={setStudyOpen} title="Study this material" description="Choose what to create next."><div className="grid gap-3 [&_button]:w-full [&_button]:justify-start">{study}</div></Sheet>
    <Sheet open={toolsOpen} onOpenChange={setToolsOpen} title="Manage document"><div className="grid gap-3 [&_button]:w-full [&_button]:justify-start">{favorite}<div className="space-y-3 border-t border-line pt-3">{tools}</div></div></Sheet>
  </div>;
}
