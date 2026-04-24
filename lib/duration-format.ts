export function parseDurationToSeconds(value: string | number | null | undefined): number | undefined {
  if (value == null) {
    return undefined;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  if (/^\d+$/.test(trimmed)) {
    const seconds = Number(trimmed);
    return Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : undefined;
  }

  const mmss = trimmed.match(/^(\d{1,3}):([0-5]\d)$/);
  if (!mmss) {
    return undefined;
  }
  const minutes = Number(mmss[1]);
  const seconds = Number(mmss[2]);
  const totalSeconds = minutes * 60 + seconds;
  return totalSeconds > 0 ? totalSeconds : undefined;
}

export function formatSecondsToMMSS(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value) || value < 0) {
    return "";
  }
  const total = Math.floor(value);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
