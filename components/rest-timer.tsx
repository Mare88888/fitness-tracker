"use client";

import { useEffect, useMemo, useState } from "react";

type RestTimerProps = {
  defaultSeconds?: number;
  className?: string;
  onComplete?: () => void;
};

function formatSeconds(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function RestTimer({ defaultSeconds = 90, className = "", onComplete }: RestTimerProps) {
  const safeDefaultSeconds = Math.max(1, Math.floor(defaultSeconds));
  const [secondsLeft, setSecondsLeft] = useState(safeDefaultSeconds);
  const [isRunning, setIsRunning] = useState(false);

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

  const progressPercent = useMemo(() => {
    const elapsed = safeDefaultSeconds - secondsLeft;
    return Math.min(100, Math.max(0, (elapsed / safeDefaultSeconds) * 100));
  }, [safeDefaultSeconds, secondsLeft]);

  const handleStartPause = () => {
    if (secondsLeft === 0) {
      setSecondsLeft(safeDefaultSeconds);
    }
    setIsRunning((previous) => !previous);
  };

  const handleReset = () => {
    setIsRunning(false);
    setSecondsLeft(safeDefaultSeconds);
  };

  return (
    <section
      className={`rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 ${className}`}
    >
      <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Rest Timer</h2>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
        {formatSeconds(secondsLeft)}
      </p>

      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
        <div
          className="h-full bg-zinc-900 transition-[width] duration-500 dark:bg-zinc-100"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={handleStartPause}
          className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {isRunning ? "Pause" : "Start"}
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Reset
        </button>
      </div>
    </section>
  );
}
