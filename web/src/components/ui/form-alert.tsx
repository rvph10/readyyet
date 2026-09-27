import { CircleAlert } from "lucide-react";
import type { ReactNode } from "react";

// An error about the whole form rather than one field (the API unreachable,
// too many attempts), shown at the top of its fields (ADR 0049).
export function FormAlert({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="flex gap-2 rounded-xl bg-red-50 px-3.5 py-3 text-p-sm text-red-700">
      <CircleAlert aria-hidden="true" strokeWidth={1.5} className="mt-0.5 size-4 shrink-0" />
      {children}
    </p>
  );
}
