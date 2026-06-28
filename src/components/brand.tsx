import { cn } from "@/lib/utils";

/**
 * Vylora X wordmark. Kept as a small, self-contained component so the portal
 * is easy to white-label later — swap this one file per client if needed.
 */
export function Brand({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 text-sm font-semibold tracking-tight",
        className,
      )}
    >
      <span className="grid h-6 w-6 place-items-center rounded-md bg-foreground text-background font-bold">
        V
      </span>
      <span>
        Vylora <span className="text-muted-foreground">X</span>
      </span>
    </span>
  );
}
