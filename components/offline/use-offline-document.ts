"use client";

import { useEffect, useRef, useState } from "react";
import { offlineCommand, type OfflineDocument } from "@/lib/offline/client";

// This hook adds persistence to the real editor; it does not render a second UI.
export function useOfflineDocument(initial: OfflineDocument, editing: boolean, title: string, content: string, restore: (document: OfflineDocument) => void) {
  const restoreRef = useRef(restore);
  restoreRef.current = restore;
  const [ready, setReady] = useState(false);
  const [problem, setProblem] = useState("");
  const [saveStatus, setSaveStatus] = useState("");
  const baseline = useRef(initial);
  const signature = useRef("");
  const live = useRef({ editing, title, content, ready });
  live.current = { editing, title, content, ready };
  const flush = useRef<() => void>(() => undefined);
  flush.current = () => {
    if (!ready || !live.current.editing) return;
    const values = live.current;
    const next = `${values.title}\u0000${values.content}`;
    if (next === signature.current) return;
    setSaveStatus("Saving on this device…");
    void offlineCommand<OfflineDocument>("SAVE_DOCUMENT", { path: initial.path, title: values.title, content: values.content, updatedAt: baseline.current.updatedAt }).then(document => {
      signature.current = next;
      setSaveStatus(document.pending ? "Saved on this device · waiting to sync" : "Synced to your account");
      if (`${live.current.title}\u0000${live.current.content}` === next) restoreRef.current(document);
    }).catch(caught => { setSaveStatus("Changes have not been saved"); setProblem(`Local save failed: ${caught.message}. Keep this page open and export your draft.`); });
  };
  useEffect(() => {
    let active = true;
    void offlineCommand<OfflineDocument | null>("DOCUMENT", { document: baseline.current }).then(document => {
      if (!active || !document) return;
      signature.current = `${document.title}\u0000${document.content}`;
      if (document.pending || document.updatedAt > baseline.current.updatedAt) restoreRef.current(document);
      baseline.current = document;
      if (document.conflict) setProblem("Another device changed this document. Your local draft is kept. Export it before loading the online version to merge your changes.");
      setReady(true);
    }).catch(caught => { if (active && !navigator.onLine) setProblem(`Local saving is unavailable: ${caught.message}`); });
    const receive = (event: Event) => {
      const document = (event as CustomEvent<OfflineDocument & { force?: boolean }>).detail;
      if (document.path !== baseline.current.path) return;
      setProblem(document.conflict ? "Another device changed this document. Your local draft is kept. Export it before loading the online version to merge your changes." : "");
      if (!document.pending && `${document.title}\u0000${document.content}` === signature.current) baseline.current = document;
      if (document.force || (!document.pending && `${live.current.title}\u0000${live.current.content}` === signature.current)) {
        baseline.current = document;
        signature.current = `${document.title}\u0000${document.content}`;
        restoreRef.current(document);
        setSaveStatus(document.pending ? "Saved on this device · waiting to sync" : "Synced to your account");
      }
    };
    window.addEventListener("memoria:offline-document", receive);
    return () => { active = false; window.removeEventListener("memoria:offline-document", receive); };
  }, []);
  useEffect(() => {
    if (!ready || !editing) return;
    const next = `${title}\u0000${content}`;
    if (signature.current === next) return;
    const timer = window.setTimeout(() => flush.current(), 400);
    return () => clearTimeout(timer);
  }, [ready, editing, title, content, initial.path]);
  useEffect(() => {
    const persist = () => flush.current();
    const leaving = (event: BeforeUnloadEvent) => {
      if (live.current.ready && live.current.editing && `${live.current.title}\u0000${live.current.content}` !== signature.current) {
        persist(); event.preventDefault(); event.returnValue = "";
      }
    };
    const hidden = () => { if (document.visibilityState === "hidden") persist(); };
    window.addEventListener("pagehide", persist);
    window.addEventListener("beforeunload", leaving);
    document.addEventListener("visibilitychange", hidden);
    return () => { persist(); window.removeEventListener("pagehide", persist); window.removeEventListener("beforeunload", leaving); document.removeEventListener("visibilitychange", hidden); };
  }, []);
  useEffect(() => {
    if (!ready) return;
    const pull = () => {
      if (navigator.onLine && document.visibilityState === "visible" && !live.current.editing) void offlineCommand("PULL_DOCUMENT", { path: initial.path }).catch(() => undefined);
    };
    const timer = setInterval(pull, 30_000);
    window.addEventListener("online", pull);
    return () => { clearInterval(timer); window.removeEventListener("online", pull); };
  }, [ready, initial.path]);
  return { problem, saveStatus };
}
