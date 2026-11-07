"use client";

import { useRouter } from "next/navigation";
import { startTransition, useEffect } from "react";

// For a page left open in a tab, which must not show what was true hours ago.
// Also on coming back to the tab, and no request while it's hidden.
export function RefreshWhileOpen({ every }: { every: number }) {
  const router = useRouter();

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") startTransition(() => router.refresh());
    };
    const timer = setInterval(refresh, every);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router, every]);

  return null;
}
