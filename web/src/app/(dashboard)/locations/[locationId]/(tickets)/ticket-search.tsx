"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { SearchField } from "@/components/ui/search-field";
import { ticketsHref, type View } from "./ticket-views";

// Each pause reloads the page, so a pause between letters shouldn't count.
const DEBOUNCE_MS = 400;

// The search is in the URL, so a reload or a shared link keeps it. It replaces
// the history entry, so Back leaves the list instead of undoing each letter.
export function TicketSearch({
  locationId,
  view,
  q,
  label,
  placeholder,
}: {
  locationId: string;
  view: View;
  q: string;
  label: string;
  placeholder: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(q);
  const [sent, setSent] = useState(q);
  const [seen, setSeen] = useState(q);
  const [pending, startTransition] = useTransition();

  // A `q` that isn't ours, like the navigation's Tickets link clearing it. One
  // of ours landing late must not overwrite what's been typed since.
  if (q !== seen) {
    setSeen(q);
    if (!pending && q !== sent) {
      setValue(q);
      setSent(q);
    }
  }

  useEffect(() => {
    const next = value.trim();
    if (next === q) return;
    const timer = setTimeout(() => {
      setSent(next);
      startTransition(() => router.replace(ticketsHref(locationId, { view, q: next }), { scroll: false }));
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [value, q, locationId, view, router]);

  return (
    <SearchField
      label={label}
      placeholder={placeholder}
      maxLength={100}
      value={value}
      onChange={setValue}
      className="min-w-64 flex-1 xl:max-w-96"
    />
  );
}
