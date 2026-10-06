"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Pause, Play, RotateCcw, Settings2, SkipBack, SkipForward, Square, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { speechChunks, speechSentences, speechText } from "@/lib/speech-text";

export function ReadAloud({ content, title }: { content: string; title?: string }) {
  const id = useId();
  const [supported, setSupported] = useState<boolean | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voice, setVoice] = useState("");
  const [rate, setRate] = useState(1);
  const [status, setStatus] = useState<"idle" | "reading" | "paused">("idle");
  const [sentenceIndex, setSentenceIndex] = useState(0);
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState("");
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [portalTarget, setPortalTarget] = useState<Element | null>(null);
  const playerRef = useRef<HTMLElement>(null);
  const inlinePlayRef = useRef<HTMLButtonElement>(null);
  const generation = useRef(0);
  const ownsSpeech = useRef(false);
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);
  const preferences = useRef({ voice, rate });
  preferences.current = { voice, rate };
  const availableVoices = useRef(voices);
  availableVoices.current = voices;
  const sentences = useMemo(() => speechSentences(speechText(content)), [content]);
  const playing = status !== "idle";
  const docked = mobile && (playing || !!error);
  const selected = Math.min(sentenceIndex, Math.max(0, sentences.length - 1));

  const stop = useCallback(() => {
    generation.current++;
    if (ownsSpeech.current) window.speechSynthesis.cancel();
    ownsSpeech.current = false; utterance.current = null;
    setStatus("idle"); setError(""); setFinished(false);
  }, []);
  const restoreInlineFocus = useCallback(() => inlinePlayRef.current?.focus({ preventScroll: true }), []);

  useEffect(() => {
    if (!docked || !portalTarget) return;
    if (!document.querySelector("dialog[open]")) playerRef.current?.querySelector<HTMLButtonElement>('button[title="Pause reading"], button[title="Resume reading"], button[title="Retry reading"]')?.focus({ preventScroll: true });
    return () => { if (!document.querySelector("dialog[open]")) window.requestAnimationFrame(restoreInlineFocus); };
  }, [docked, portalTarget, restoreInlineFocus]);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 639px)");
    const updateMobile = () => setMobile(query.matches);
    const updateTarget = () => setPortalTarget(document.fullscreenElement ?? document.querySelector(".reader-fullscreen") ?? document.body);
    updateMobile(); updateTarget();
    query.addEventListener("change", updateMobile);
    document.addEventListener("fullscreenchange", updateTarget);
    window.addEventListener("memoria:reader-fullscreen", updateTarget);
    return () => {
      query.removeEventListener("change", updateMobile);
      document.removeEventListener("fullscreenchange", updateTarget);
      window.removeEventListener("memoria:reader-fullscreen", updateTarget);
    };
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
      generation.current++; ownsSpeech.current = false; utterance.current = null;
      setStatus("idle"); setError(""); setFinished(false);
    };
    window.addEventListener("memoria:read-aloud", stopForAnotherReader);
    return () => {
      synthesis.removeEventListener("voiceschanged", updateVoices);
      window.removeEventListener("memoria:read-aloud", stopForAnotherReader);
    };
  }, [id]);

  useEffect(() => {
    setSentenceIndex(0); setStatus("idle"); setError(""); setFinished(false);
    return stop;
  }, [content, stop]);

  function begin(index: number, paused = false) {
    if (!sentences[index]) return;
    const synthesis = window.speechSynthesis;
    window.dispatchEvent(new CustomEvent("memoria:read-aloud", { detail: id }));
    const run = ++generation.current;
    synthesis.cancel(); synthesis.resume();
    ownsSpeech.current = true; setError(""); setFinished(false);
    setStatus(paused ? "paused" : "reading");

    function speakSentence(position: number) {
      if (run !== generation.current) return;
      if (position >= sentences.length) {
        ownsSpeech.current = false; utterance.current = null;
        setStatus("idle"); setFinished(true); setSentenceIndex(0); return;
      }
      setSentenceIndex(position);
      const chunks = speechChunks(sentences[position]);
      const options = preferences.current;
      const chosenVoice = availableVoices.current.find(item => item.voiceURI === options.voice);
      function speakChunk(chunk: number) {
        if (run !== generation.current) return;
        const next = new SpeechSynthesisUtterance(chunks[chunk]);
        next.rate = options.rate;
        if (chosenVoice) { next.voice = chosenVoice; next.lang = chosenVoice.lang; }
        else next.lang = document.documentElement.lang || navigator.language;
        next.onend = () => chunk + 1 < chunks.length ? speakChunk(chunk + 1) : speakSentence(position + 1);
        const fail = () => {
          if (run !== generation.current) return;
          generation.current++; ownsSpeech.current = false; utterance.current = null;
          setStatus("idle"); setError("Reading stopped. Try again or choose another voice.");
        };
        next.onerror = fail;
        utterance.current = next;
        try { synthesis.speak(next); } catch { fail(); }
      }
      speakChunk(0);
    }
    speakSentence(index);
    if (paused) synthesis.pause();
  }

  function read() {
    const synthesis = window.speechSynthesis;
    if (status === "reading") { synthesis.pause(); setStatus("paused"); return; }
    if (status === "paused") { synthesis.resume(); setStatus("reading"); return; }
    begin(selected);
  }

  function chooseSentence(index: number) {
    setSentenceIndex(index); setFinished(false);
    if (playing) begin(index, status === "paused");
  }

  if (supported === null) return null;
  if (!supported) return <p className="text-xs text-ink-soft">Read aloud is unavailable in this browser.</p>;
  const readingLabel = status === "reading" ? "Pause reading" : status === "paused" ? "Resume reading" : error ? "Retry reading" : finished ? "Read again" : "Read aloud";
  const progress = sentences.length ? `Sentence ${selected + 1} of ${sentences.length}` : "No readable text";
  const playbackButtons = (compact: boolean) => <>
    <Button type="button" variant="ghost" size="icon" className="justify-self-center" disabled={selected === 0} onClick={() => chooseSentence(selected - 1)} aria-label="Previous sentence" title="Previous sentence"><SkipBack className="h-4 w-4" aria-hidden="true" /></Button>
    <Button type="button" variant={compact ? "primary" : "outline"} size={compact ? "icon" : "sm"} className="justify-self-center" disabled={!sentences.length} onClick={read} aria-label={readingLabel + (playing ? "" : ": " + (title || "note"))} title={readingLabel}>
      {status === "reading" ? <Pause className="h-4 w-4" aria-hidden="true" /> : error ? <RotateCcw className="h-4 w-4" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}{!compact && readingLabel}
    </Button>
    <Button type="button" variant="ghost" size="icon" className="justify-self-center" disabled={selected >= sentences.length - 1} onClick={() => chooseSentence(selected + 1)} aria-label="Next sentence" title="Next sentence"><SkipForward className="h-4 w-4" aria-hidden="true" /></Button>
    <Button type="button" variant="ghost" size="icon" className="justify-self-center" onClick={stop} aria-label="Stop reading" title="Stop reading"><Square className="h-4 w-4" aria-hidden="true" /></Button>
    <Button type="button" variant="ghost" size="icon" className="justify-self-center" onClick={() => setOptionsOpen(true)} aria-label="Reading options" aria-haspopup="dialog" aria-expanded={optionsOpen} title="Reading options"><Settings2 className="h-4 w-4" aria-hidden="true" /></Button>
  </>;

  return <div className="min-w-0 print:hidden" data-read-aloud-active={playing || undefined}>
    <div role="group" aria-label="Read aloud controls" className={docked ? "hidden" : "rounded-control border border-line bg-surface p-3"}>
      {playing ? <>
        <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-medium text-ink-soft">{status === "paused" ? "Paused · " : ""}{progress}</p><div className="flex flex-wrap items-center gap-1">{playbackButtons(false)}</div></div>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-soft">{sentences[selected]}</p>
      </> : <div className="flex items-center justify-between gap-2">
        <div className="min-w-0"><p className="flex items-center gap-2 text-sm font-medium"><Volume2 className="h-4 w-4 shrink-0 text-ink-soft" aria-hidden="true" />Listen to this memory</p><p className="mt-1 text-xs text-ink-soft">{finished ? "Reading finished." : selected ? progress : "Read sentence by sentence"} · {rate}×</p></div>
        <div className="flex shrink-0 items-center gap-1"><Button ref={inlinePlayRef} type="button" variant="outline" size="icon" disabled={!sentences.length} onClick={read} aria-label={readingLabel + ": " + (title || "note")} title={readingLabel}><Play className="h-4 w-4" aria-hidden="true" /></Button><Button type="button" variant="ghost" size="icon" onClick={() => setOptionsOpen(true)} aria-label="Reading options" aria-haspopup="dialog" aria-expanded={optionsOpen} title="Reading options"><Settings2 className="h-4 w-4" aria-hidden="true" /></Button></div>
      </div>}
      {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
    </div>
    <p role="status" className="sr-only">{status === "reading" ? `Reading ${title || "note"} aloud.` : status === "paused" ? "Reading paused." : finished ? "Reading finished." : ""}</p>
    {docked && portalTarget && createPortal(<aside ref={playerRef} data-mobile-reading-player aria-label={`Read aloud: ${title || "note"}`} className="mobile-reading-player rounded-card border border-line-strong bg-surface-raised p-3 text-ink shadow-dialog print:hidden">
      {error ? <p role="alert" className="mb-2 text-xs text-danger">{error}</p> : <div className="mb-2 flex items-center justify-between gap-2 text-xs text-ink-soft"><p>{status === "paused" ? "Paused · " : ""}{progress}</p><span>{rate}×</span></div>}
      <div role="group" aria-label="Playback controls" className="grid grid-cols-5 gap-1">{playbackButtons(true)}</div>
    </aside>, portalTarget)}
    <Dialog open={optionsOpen} onOpenChange={setOptionsOpen} title="Reading options" description="Choose a voice, speed, and sentence." placement="side" onAfterClose={() => { if (document.activeElement === document.body) restoreInlineFocus(); }} footer={<><Button type="button" variant="ghost" onClick={() => setOptionsOpen(false)}>Done</Button><Button type="button" disabled={!sentences.length} onClick={read}>{status === "reading" ? <Pause className="h-4 w-4" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}{readingLabel}</Button></>}>
      <div className="space-y-5">
        <label className="block text-sm font-medium">Voice<select aria-label="Reading voice" className="mt-2 min-h-12 w-full min-w-0 rounded-control border border-line bg-surface px-3 text-base" value={voice} onChange={event => { preferences.current = { ...preferences.current, voice: event.target.value }; setVoice(event.target.value); }}><option value="">Default voice</option>{voices.map((item, index) => <option key={item.voiceURI + index} value={item.voiceURI}>{item.name} ({item.lang})</option>)}</select></label>
        <label className="block text-sm font-medium">Speed<select aria-label="Reading speed" className="mt-2 min-h-12 w-full rounded-control border border-line bg-surface px-3 text-base" value={rate} onChange={event => { const speed = Number(event.target.value); preferences.current = { ...preferences.current, rate: speed }; setRate(speed); }}>{[0.75, 1, 1.25, 1.5, 2].map(speed => <option key={speed} value={speed}>{speed}×{speed === 1 ? " · Normal" : ""}</option>)}</select></label>
        {playing && <p className="text-xs text-ink-soft">Voice and speed changes apply to the next sentence.</p>}
        {!!sentences.length && <label className="block text-sm font-medium">Sentence<select aria-label="Reading sentence" className="mt-2 min-h-12 w-full min-w-0 rounded-control border border-line bg-surface px-3 text-base" value={selected} onChange={event => chooseSentence(Number(event.target.value))}>{sentences.map((sentence, index) => <option key={index} value={index}>{index + 1}. {sentence}</option>)}</select></label>}
        {!!sentences.length && <div className="rounded-control bg-surface-muted p-4"><p className="mb-2 text-xs font-medium text-ink-soft">{progress}</p><p className="break-words text-sm leading-relaxed text-ink">{sentences[selected]}</p></div>}
      </div>
    </Dialog>
  </div>;
}
