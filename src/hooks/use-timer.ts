import { useState, useEffect, useCallback, useRef } from "react";
import { MAX_READING_MINUTES } from "@/lib/constants";

const STORAGE_KEY = "famboard-reading-timer";

interface TimerState {
  status: "idle" | "running" | "paused";
  startedAt: number | null;
  pausedAt: number | null;
  totalPausedMs: number;
}

const IDLE_STATE: TimerState = {
  status: "idle",
  startedAt: null,
  pausedAt: null,
  totalPausedMs: 0,
};

function loadState(): TimerState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return IDLE_STATE;
    const parsed = JSON.parse(raw) as TimerState;
    // Validate shape
    if (!parsed.startedAt || !["running", "paused"].includes(parsed.status)) {
      return IDLE_STATE;
    }
    return parsed;
  } catch {
    return IDLE_STATE;
  }
}

function saveState(state: TimerState) {
  if (state.status === "idle") {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
}

function calcElapsedMs(state: TimerState): number {
  if (!state.startedAt) return 0;
  const now = state.status === "paused" && state.pausedAt ? state.pausedAt : Date.now();
  return Math.max(0, now - state.startedAt - state.totalPausedMs);
}

export function useTimer() {
  const [state, setState] = useState<TimerState>(loadState);
  const [elapsedMs, setElapsedMs] = useState(() => calcElapsedMs(loadState()));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const maxMs = MAX_READING_MINUTES * 60 * 1000;

  // Sync elapsed display on interval
  useEffect(() => {
    if (state.status === "running") {
      const tick = () => {
        const ms = calcElapsedMs(state);
        setElapsedMs(ms);
        // Auto-stop at max
        if (ms >= maxMs) {
          const stopped: TimerState = { ...IDLE_STATE };
          setState(stopped);
          saveState(stopped);
          setElapsedMs(maxMs);
        }
      };
      tick();
      intervalRef.current = setInterval(tick, 1000);
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    } else if (state.status === "paused") {
      setElapsedMs(calcElapsedMs(state));
    }
  }, [state, maxMs]);

  const start = useCallback(() => {
    const next: TimerState = {
      status: "running",
      startedAt: Date.now(),
      pausedAt: null,
      totalPausedMs: 0,
    };
    setState(next);
    saveState(next);
  }, []);

  const pause = useCallback(() => {
    setState((prev) => {
      if (prev.status !== "running") return prev;
      const next: TimerState = { ...prev, status: "paused", pausedAt: Date.now() };
      saveState(next);
      return next;
    });
  }, []);

  const resume = useCallback(() => {
    setState((prev) => {
      if (prev.status !== "paused" || !prev.pausedAt) return prev;
      const additionalPaused = Date.now() - prev.pausedAt;
      const next: TimerState = {
        ...prev,
        status: "running",
        pausedAt: null,
        totalPausedMs: prev.totalPausedMs + additionalPaused,
      };
      saveState(next);
      return next;
    });
  }, []);

  const stop = useCallback((): number => {
    const ms = calcElapsedMs(state);
    const minutes = Math.max(1, Math.round(ms / 60000));
    const capped = Math.min(minutes, MAX_READING_MINUTES);
    setState(IDLE_STATE);
    saveState(IDLE_STATE);
    setElapsedMs(0);
    return capped;
  }, [state]);

  const reset = useCallback(() => {
    setState(IDLE_STATE);
    saveState(IDLE_STATE);
    setElapsedMs(0);
  }, []);

  const elapsedSeconds = Math.floor(elapsedMs / 1000);
  const displayMinutes = Math.floor(elapsedSeconds / 60);
  const displaySeconds = elapsedSeconds % 60;

  return {
    status: state.status,
    elapsedMs,
    displayMinutes,
    displaySeconds,
    isActive: state.status !== "idle",
    start,
    pause,
    resume,
    stop,
    reset,
  };
}

/** Check if a timer is active without subscribing to updates */
export function hasActiveTimer(): boolean {
  return loadState().status !== "idle";
}
