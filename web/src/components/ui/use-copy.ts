"use client";

import { useEffect, useState } from "react";

// How long a copy button shows its check before it offers to copy again.
const COPIED_FOR_MS = 2000;

// Resolves false where the browser refuses the clipboard, so the caller can
// fall back to letting the value be copied by hand.
export function useCopy() {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), COPIED_FOR_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      return true;
    } catch {
      return false;
    }
  }

  return { copied, copy };
}
