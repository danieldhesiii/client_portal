"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Silently re-fetches the current route's server components on an interval so a
 * page reflects new data without a manual refresh. Because it only triggers a
 * soft `router.refresh()`, client state (e.g. a half-typed reply) is preserved.
 * Pauses while the tab is hidden to avoid needless work.
 */
export function AutoRefresh({ interval = 5000 }: { interval?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, interval);
    return () => clearInterval(id);
  }, [router, interval]);
  return null;
}
