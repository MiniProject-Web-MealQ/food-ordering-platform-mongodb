import { useCallback, useEffect, useRef } from "react";

function cancelNotes(resources) {
  for (const note of resources.notes) {
    note.oscillator.onended = null;
    try { note.oscillator.stop(); } catch { /* Already stopped or unsupported. */ }
    note.oscillator.disconnect();
    note.gain.disconnect();
  }
  resources.notes.clear();
}

function closeContext(resources) {
  const context = resources.context;
  resources.context = null;
  if (context && context.state !== "closed") {
    try { void context.close().catch(() => {}); } catch { /* Audio is optional. */ }
  }
}

function playNote(resources, frequency, duration, delay = 0, volume = 0.022) {
  const context = resources.context;
  if (!context || context.state !== "running") return;
  let oscillator;
  let gain;
  let note;
  try {
    oscillator = context.createOscillator();
    gain = context.createGain();
    const start = context.currentTime + delay;
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    note = { oscillator, gain };
    resources.notes.add(note);
    oscillator.onended = () => {
      resources.notes.delete(note);
      oscillator.disconnect();
      gain.disconnect();
    };
    oscillator.start(start);
    oscillator.stop(start + duration + 0.015);
  } catch {
    if (note) resources.notes.delete(note);
    if (oscillator) {
      oscillator.onended = null;
      try { oscillator.stop(); } catch { /* Not started. */ }
      oscillator.disconnect();
    }
    gain?.disconnect();
  }
}

/** Optional synthesized sounds; start() must be called by an explicit gesture. */
export function useRandomAudio(enabled = false) {
  const resources = useRef({ context: null, notes: new Set(), active: false, lastTick: -Infinity });
  const enabledRef = useRef(enabled);

  const stop = useCallback(() => {
    resources.current.active = false;
    cancelNotes(resources.current);
  }, []);

  useEffect(() => {
    enabledRef.current = enabled;
    if (!enabled) {
      stop();
      closeContext(resources.current);
    }
  }, [enabled, stop]);

  useEffect(() => {
    const current = resources.current;
    function stopHidden() {
      if (document.hidden) stop();
    }
    document.addEventListener("visibilitychange", stopHidden);
    return () => {
      document.removeEventListener("visibilitychange", stopHidden);
      current.active = false;
      cancelNotes(current);
      closeContext(current);
    };
  }, [stop]);

  const start = useCallback(() => {
    if (!enabledRef.current || typeof window === "undefined") return false;
    const current = resources.current;
    cancelNotes(current);
    current.active = false;
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return false;
      if (!current.context || current.context.state === "closed") current.context = new Audio();
      const context = current.context;
      current.active = true;
      current.lastTick = -Infinity;
      // Calling resume here, before awaiting anything, preserves user activation.
      if (context.state !== "running") {
        void context.resume().catch(() => {
          if (current.context === context) current.active = false;
        });
      }
      return true;
    } catch {
      current.active = false;
      return false;
    }
  }, []);

  const tick = useCallback(() => {
    const current = resources.current;
    if (!enabledRef.current || !current.active || current.context?.state !== "running") return;
    const now = current.context.currentTime;
    if (now - current.lastTick < 0.07) return;
    current.lastTick = now;
    playNote(current, 740, 0.045, 0, 0.018);
  }, []);

  const finish = useCallback(() => {
    const current = resources.current;
    if (!enabledRef.current || !current.active) return;
    current.active = false;
    cancelNotes(current);
    playNote(current, 523.25, 0.16);
    playNote(current, 783.99, 0.2, 0.12);
  }, []);

  return { start, tick, finish, stop };
}
