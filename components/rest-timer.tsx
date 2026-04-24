"use client";

import { useEffect, useMemo, useState } from "react";

const REST_TIMER_SECONDS_KEY = "fitness_rest_timer_seconds_v1";

type RestTimerProps = {
  defaultSeconds?: number;
  className?: string;
  onComplete?: () => void;
  startSignal?: number;
};

function formatSeconds(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function RestTimer({ defaultSeconds = 90, className = "", onComplete, startSignal = 0 }: RestTimerProps) {
  const safeDefaultSeconds = Math.max(1, Math.floor(defaultSeconds));
  const [selectedSeconds, setSelectedSeconds] = useState(safeDefaultSeconds);
  const [secondsLeft, setSecondsLeft] = useState(safeDefaultSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const safeSelectedSeconds = Math.max(1, Math.floor(selectedSeconds));

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const raw = window.localStorage.getItem(REST_TIMER_SECONDS_KEY);
    if (!raw) {
      return;
    }
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return;
    }
    const restored = Math.floor(parsed);
    queueMicrotask(() => {
      setSelectedSeconds(restored);
      setSecondsLeft(restored);
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(REST_TIMER_SECONDS_KEY, String(safeSelectedSeconds));
  }, [safeSelectedSeconds]);

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const interval = window.setInterval(() => {
      setSecondsLeft((previous) => {
        if (previous <= 1) {
          window.clearInterval(interval);
          setIsRunning(false);
          onComplete?.();
          return 0;
        }

        return previous - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isRunning, onComplete]);

  useEffect(() => {
    if (startSignal <= 0) {
      return;
    }
    queueMicrotask(() => {
      setSecondsLeft(safeSelectedSeconds);
      setIsRunning(true);
    });
  }, [safeSelectedSeconds, startSignal]);

  const progressPercent = useMemo(() => {
    const elapsed = safeSelectedSeconds - secondsLeft;
    return Math.min(100, Math.max(0, (elapsed / safeSelectedSeconds) * 100));
  }, [safeSelectedSeconds, secondsLeft]);

  const handleStartPause = () => {
    if (secondsLeft === 0) {
      setSecondsLeft(safeSelectedSeconds);
    }
    setIsRunning((previous) => !previous);
  };

  const handleReset = () => {
    setIsRunning(false);
    setSecondsLeft(safeSelectedSeconds);
  };

  const handleDurationChange = (value: string) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return;
    }
    const next = Math.floor(parsed);
    setSelectedSeconds(next);
    setIsRunning(false);
    setSecondsLeft(next);
  };

  return (
    <section
      className={`surface-card ${className}`}
    >
      <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Rest Timer</h2>
      <div className="mt-3 space-y-2">
        <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-300">
          Rest duration (seconds)
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            value={selectedSeconds}
            onChange={(event) => handleDurationChange(event.target.value)}
            className="field w-28"
          />
          <button type="button" onClick={() => handleDurationChange("60")} className="btn btn-secondary px-2 py-1 text-xs">
            60s
          </button>
          <button type="button" onClick={() => handleDurationChange("90")} className="btn btn-secondary px-2 py-1 text-xs">
            90s
          </button>
          <button type="button" onClick={() => handleDurationChange("120")} className="btn btn-secondary px-2 py-1 text-xs">
            120s
          </button>
        </div>
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
        {formatSeconds(secondsLeft)}
      </p>

      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
        <div
          className="h-full bg-emerald-600 transition-[width] duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={handleStartPause}
          className="btn btn-primary"
        >
          {isRunning ? "Pause" : "Start"}
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="btn btn-secondary"
        >
          Reset
        </button>
      </div>
    </section>
  );
}
