"use client";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";
type ToastKind = "success" | "error";
interface ToastMessage { id: string; message: string; kind: ToastKind }
export function toast(message: string, kind: ToastKind = "success") {
  window.dispatchEvent(new CustomEvent("memoria:toast", { detail: { id: crypto.randomUUID(), message, kind } }));
}
function ToastItem({ item, dismiss }: { item: ToastMessage; dismiss: (id: string) => void }) {
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused || item.kind === "error") return;
    const timer = window.setTimeout(() => dismiss(item.id), 6000);
    return () => window.clearTimeout(timer);
  }, [dismiss, item.id, item.kind, paused]);
  const Icon = item.kind === "error" ? AlertCircle : CheckCircle2;
  return <div role={item.kind === "error" ? "alert" : "status"} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)} className="motion-panel pointer-events-auto flex items-start gap-3 rounded-card border border-line bg-surface-raised p-4 text-sm text-ink shadow-dialog"><Icon className={`mt-0.5 h-5 w-5 shrink-0 ${item.kind === "error" ? "text-danger" : "text-success"}`} aria-hidden="true" /><p className="min-w-0 flex-1 break-words leading-relaxed">{item.message}</p><button type="button" onClick={() => dismiss(item.id)} aria-label="Dismiss notification" className="-m-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-control hover:bg-surface-muted"><X className="h-4 w-4" /></button></div>;
}
export function ToastViewport() {
  const viewport = useRef<HTMLElement>(null);
  const [messages, setMessages] = useState<ToastMessage[]>([]);
  const [dismiss] = useState(() => (id: string) => setMessages(items => items.filter(item => item.id !== id)));
  useEffect(() => {
    const element = viewport.current;
    if (!element || !element.showPopover) return;
    element.setAttribute("popover", "manual");
    if (element.matches(":popover-open")) element.hidePopover();
    if (messages.length) element.showPopover();
  }, [messages]);
  useEffect(() => {
    const receive = (event: Event) => setMessages(items => [...items.slice(-3), (event as CustomEvent<ToastMessage>).detail]);
    window.addEventListener("memoria:toast", receive);
    return () => window.removeEventListener("memoria:toast", receive);
  }, []);
  return <aside ref={viewport} aria-label="Notifications" className="toast-viewport pointer-events-none fixed bottom-24 left-auto right-4 top-auto z-[200] m-0 w-[calc(100%-2rem)] max-w-sm overflow-visible border-0 bg-transparent p-0 text-ink sm:bottom-6"><div className="flex flex-col gap-3">{messages.map(item => <ToastItem key={item.id} item={item} dismiss={dismiss} />)}</div></aside>;
}
