"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Pause, Play, Square, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { speechChunks, speechText } from "@/lib/speech-text";

export function ReadAloud({ content, title }: { content: string; title?: string }) {
  const id = useId();
  const [supported, setSupported] = useState<boolean | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voice, setVoice] = useState("");
  const [rate, setRate] = useState(1);
  const [status, setStatus] = useState<"idle" | "reading" | "paused">("idle");
  const [error, setError] = useState("");
  const generation = useRef(0);
  const ownsSpeech = useRef(false);
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);
  const chunks = useMemo(() => speechChunks(speechText(content)), [content]);
  const stop = useCallback(() => {
    generation.current++;
    if (ownsSpeech.current) window.speechSynthesis.cancel();
    ownsSpeech.current = false; utterance.current = null; setStatus("idle");
  }, []);

  useEffect(() => {
    const available = "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
    setSupported(available);
    if (!available) return;
    const synthesis = window.speechSynthesis;
    const updateVoices = () => setVoices(synthesis.getVoices());
    updateVoices();
    synthesis.addEventListener("voiceschanged", updateVoices);
    const stopForAnotherReader = (event: Event) => {
      if ((event as CustomEvent<string>).detail === id) return;
      generation.current++;
      ownsSpeech.current = false;
      utterance.current = null;
      setStatus("idle");
    };
    window.addEventListener("memoria:read-aloud", stopForAnotherReader);
    return () => {
      synthesis.removeEventListener("voiceschanged", updateVoices);
      window.removeEventListener("memoria:read-aloud", stopForAnotherReader);
    };
  }, [id]);

  useEffect(() => {
    setStatus("idle"); setError("");
    return stop;
  }, [content, stop]);

  function read() {
    const synthesis = window.speechSynthesis;
    if (status === "reading") { synthesis.pause(); setStatus("paused"); return; }
    if (status === "paused") { synthesis.resume(); setStatus("reading"); return; }
    window.dispatchEvent(new CustomEvent("memoria:read-aloud", { detail: id }));
    synthesis.cancel(); synthesis.resume();
    ownsSpeech.current = true;
    const run = ++generation.current;
    const selectedVoice = voices.find(item => item.voiceURI === voice);
    setError(""); setStatus("reading");
    function speak(index: number) {
      if (run !== generation.current) return;
      if (index >= chunks.length) { ownsSpeech.current = false; utterance.current = null; setStatus("idle"); return; }
      const next = new SpeechSynthesisUtterance(chunks[index]);
      next.rate = rate;
      if (selectedVoice) { next.voice = selectedVoice; next.lang = selectedVoice.lang; }
      else next.lang = document.documentElement.lang || navigator.language;
      next.onend = () => speak(index + 1);
      next.onerror = () => {
        if (run !== generation.current) return;
        generation.current++;
        ownsSpeech.current = false; utterance.current = null; setStatus("idle");
        setError("Reading stopped. Try again or choose another voice.");
      };
      utterance.current = next;
      try { synthesis.speak(next); }
      catch { next.onerror?.(new Event("error") as SpeechSynthesisErrorEvent); }
    }
    speak(0);
  }

  if (supported === null) return null;
  if (!supported) return <p className="text-xs text-ink-soft">Read aloud is unavailable in this browser.</p>;
  const playing = status !== "idle";
  return <div className="space-y-2 print:hidden" aria-label="Read aloud controls">
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="outline" size="sm" disabled={!chunks.length} onClick={read} aria-label={status === "reading" ? "Pause reading" : status === "paused" ? "Resume reading" : `Read aloud: ${title || "note"}`}>
        {status === "reading" ? <Pause className="h-4 w-4" aria-hidden="true" /> : status === "paused" ? <Play className="h-4 w-4" aria-hidden="true" /> : <Volume2 className="h-4 w-4" aria-hidden="true" />}
        {status === "reading" ? "Pause reading" : status === "paused" ? "Resume reading" : "Read aloud"}
      </Button>
      {playing && <Button type="button" variant="ghost" size="sm" onClick={stop}><Square className="h-4 w-4" aria-hidden="true" />Stop</Button>}
      <label className="flex min-h-11 items-center gap-2 text-xs text-ink-soft">Speed<select aria-label="Reading speed" className="min-h-11 rounded-control border border-line bg-surface px-2 text-sm text-ink disabled:opacity-50" value={rate} disabled={playing} onChange={event => setRate(Number(event.target.value))}>{[0.75, 1, 1.25, 1.5, 2].map(speed => <option key={speed} value={speed}>{speed}×</option>)}</select></label>
      {!!voices.length && <label className="flex min-w-0 max-w-full items-center gap-2 text-xs text-ink-soft">Voice<select aria-label="Reading voice" className="min-h-11 min-w-0 max-w-48 rounded-control border border-line bg-surface px-2 text-sm text-ink disabled:opacity-50" value={voice} disabled={playing} onChange={event => setVoice(event.target.value)}><option value="">Default voice</option>{voices.map((item, index) => <option key={item.voiceURI + index} value={item.voiceURI}>{item.name} ({item.lang})</option>)}</select></label>}
    </div>
    <p role="status" className="text-xs text-ink-soft">{status === "reading" ? `Reading ${title || "note"} aloud.` : status === "paused" ? "Reading paused." : ""}</p>
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
  </div>;
}
