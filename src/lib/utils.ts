import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Tailwind-aware className combiner (shadcn convention). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format an integer with thousands separators. */
export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-GB").format(Math.round(n));
}

/** Compact number formatting, e.g. 12.3k. */
export function formatCompact(n: number): string {
  return new Intl.NumberFormat("en-GB", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

/** Format a duration given in milliseconds as e.g. "1m 23s" or "45s". */
export function formatDuration(ms: number): string {
  if (!ms || ms < 0) return "0s";
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

/** Format a 0..1 ratio as a percentage string, e.g. "42%". */
export function formatPercent(ratio: number, digits = 0): string {
  return `${(ratio * 100).toFixed(digits)}%`;
}

/** Relative change between two numbers as a signed ratio (e.g. +0.25 = +25%). */
export function trend(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null; // null = "new", no baseline
  return (current - previous) / previous;
}
