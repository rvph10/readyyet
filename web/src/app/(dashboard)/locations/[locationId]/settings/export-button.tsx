"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { buttonClass } from "@/components/ui/button";

// The browser says nothing until the archive starts arriving, which takes a
// while for a shop with many photos: held for a moment, a second tap doesn't
// start a second export.
const HELD_MS = 20_000;

export function ExportButton({ locationId }: { locationId: string }) {
  const t = useTranslations("settings.export");
  const [started, setStarted] = useState(false);
  return (
    // A download, not a page: a plain link, never prefetched.
    <a
      href={`/locations/${locationId}/export`}
      aria-disabled={started}
      onClick={(event) => {
        if (started) {
          event.preventDefault();
          return;
        }
        setStarted(true);
        setTimeout(() => setStarted(false), HELD_MS);
      }}
      className={`${buttonClass()} ${started ? "cursor-default opacity-60" : ""}`}
    >
      {t(started ? "started" : "download")}
    </a>
  );
}
