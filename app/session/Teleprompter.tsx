"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Pause, Play, X } from "lucide-react";
import { markScriptFilmedAction } from "../actions/scripts";
import type { QueuedScript } from "@/lib/db/scripts";

const MIN_SPEED = 10;
const MAX_SPEED = 150;
const DEFAULT_SPEED = 40;
const MIN_FONT = 18;
const MAX_FONT = 64;
const DEFAULT_FONT = 32;

export function Teleprompter({ scripts }: { scripts: QueuedScript[] }) {
  const [localScripts, setLocalScripts] = useState(scripts);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(DEFAULT_SPEED);
  const [fontSize, setFontSize] = useState(DEFAULT_FONT);
  const [marking, setMarking] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  // The float accumulator: the source of truth for scroll position. Only
  // ever assigned wholesale to scrollTop, never derived by reading
  // scrollTop back (that value is already rounded to an integer by the
  // browser, so `el.scrollTop += delta` loses the sub-pixel remainder every
  // frame and can stall completely when delta < 1px, i.e. at low speeds).
  const positionRef = useRef(0);
  const lastTsRef = useRef<number | null>(null);
  const playingRef = useRef(playing);
  const speedRef = useRef(speed);

  useEffect(() => {
    playingRef.current = playing;
    // Force the next frame to treat this as a fresh start rather than
    // computing a huge dt across the paused interval.
    lastTsRef.current = null;
  }, [playing]);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  // Reset the scroll position whenever the active script changes.
  useEffect(() => {
    positionRef.current = 0;
    lastTsRef.current = null;
    const el = containerRef.current;
    if (el) el.scrollTop = 0;
  }, [index]);

  useEffect(() => {
    let rafId: number;

    function tick(ts: number) {
      const el = containerRef.current;
      if (el && playingRef.current) {
        if (lastTsRef.current !== null) {
          const dtSeconds = (ts - lastTsRef.current) / 1000;
          const max = el.scrollHeight - el.clientHeight;
          positionRef.current = Math.min(Math.max(positionRef.current + speedRef.current * dtSeconds, 0), max);
          el.scrollTop = positionRef.current;
        }
        lastTsRef.current = ts;
      } else {
        lastTsRef.current = null;
      }
      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const script = localScripts[index];

  function goTo(newIndex: number) {
    setIndex(Math.max(0, Math.min(newIndex, localScripts.length - 1)));
  }

  function markFilmed() {
    if (!script) return;
    setMarking(true);
    const filmedId = script.id;
    void markScriptFilmedAction(filmedId).finally(() => setMarking(false));
    setLocalScripts((prev) => {
      const next = prev.filter((s) => s.id !== filmedId);
      setIndex((i) => Math.max(0, Math.min(i, next.length - 1)));
      return next;
    });
  }

  if (!script) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6" style={{ background: "var(--bg)" }}>
        <p style={{ color: "var(--muted)" }}>Queue is empty — nothing left to film.</p>
        <Link href="/scripts" className="text-sm underline" style={{ color: "var(--idea)" }}>
          Write a new script
        </Link>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: "var(--bg)" }}>
      <div className="flex items-center justify-between p-4">
        <Link href="/session-prep" aria-label="Close" style={{ color: "var(--faint)" }}>
          <X size={22} />
        </Link>
        <span className="text-xs" style={{ color: "var(--faint)" }}>
          {index + 1} / {localScripts.length}
        </span>
      </div>

      <div className="px-6 pb-2">
        <div className="text-2xl font-bold leading-snug sm:text-3xl" style={{ color: "var(--text)" }}>
          {script.hook}
        </div>
      </div>

      <div
        ref={containerRef}
        className="min-h-0 flex-1 overflow-y-auto px-6 py-4"
        // Deliberately no smooth-scroll behaviour: with a CSS-smoothed
        // container, each rAF frame's scrollTop assignment kicks off its
        // own competing animation instead of a plain jump, which fights
        // the frame-by-frame accumulator above.
        style={{ scrollBehavior: "auto" }}
      >
        <p
          className="whitespace-pre-wrap leading-relaxed"
          style={{ color: "var(--text)", fontSize: `${fontSize}px` }}
        >
          {script.body}
        </p>
        <div style={{ height: "40vh" }} />
      </div>

      <div className="flex flex-col gap-3 border-t p-4" style={{ borderColor: "var(--border)", background: "var(--panel)" }}>
        <div className="flex items-center justify-center gap-4">
          <button type="button" onClick={() => goTo(index - 1)} disabled={index === 0} aria-label="Previous" style={{ color: "var(--text)", opacity: index === 0 ? 0.4 : 1 }}>
            <ChevronLeft size={26} />
          </button>
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? "Pause" : "Play"}
            className="flex h-12 w-12 items-center justify-center rounded-full"
            style={{ background: "var(--idea)", color: "#fff" }}
          >
            {playing ? <Pause size={20} /> : <Play size={20} />}
          </button>
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            disabled={index === localScripts.length - 1}
            aria-label="Next"
            style={{ color: "var(--text)", opacity: index === localScripts.length - 1 ? 0.4 : 1 }}
          >
            <ChevronRight size={26} />
          </button>
          <button
            type="button"
            onClick={markFilmed}
            disabled={marking}
            className="ml-2 rounded-lg px-4 py-2 text-sm font-medium"
            style={{ background: "var(--accent)", color: "#fff", opacity: marking ? 0.6 : 1 }}
          >
            Mark filmed
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--muted)" }}>
            Scroll speed
            <input
              type="range"
              min={MIN_SPEED}
              max={MAX_SPEED}
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              style={{ accentColor: "var(--idea)" }}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--muted)" }}>
            Text size
            <input
              type="range"
              min={MIN_FONT}
              max={MAX_FONT}
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              style={{ accentColor: "var(--idea)" }}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
