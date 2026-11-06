import { useEffect, useState } from "react";
import type { components } from "@/lib/api/schema";
import { findCustomers } from "./actions";

type Customer = components["schemas"]["CustomerDto"];

const DEBOUNCE_MS = 300;
const NONE: Customer[] = [];

// Asks the API once someone stops typing, and only once per search, so going
// back over a letter costs nothing. Answers belong to the exact search that
// asked: results for an earlier one are never offered, a click on one could send
// a Ticket's email to the wrong person. Leave `query` empty to ask nothing.
export function useCustomerLookup(locationId: string, query: string) {
  const [known, setKnown] = useState(() => new Map<string, Customer[]>());

  useEffect(() => {
    if (!query || known.has(query)) return;
    let current = true;
    const timer = setTimeout(() => {
      void findCustomers(locationId, query).then(
        (customers) => {
          if (current) setKnown((answers) => new Map(answers).set(query, customers));
        },
        // Only a help for finding someone, what it's used in works without it.
        () => undefined,
      );
    }, DEBOUNCE_MS);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [query, locationId, known]);

  return (query && known.get(query)) || NONE;
}
