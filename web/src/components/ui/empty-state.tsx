import type { ReactNode } from "react";
import { Illustration, type IllustrationName } from "../illustration";

// Where a list has nothing yet: what would be here, and the action that
// fills it. It centres itself in whatever room its tile has.
export function EmptyState({
  illustration,
  title,
  description,
  action,
}: {
  illustration: IllustrationName;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
      <Illustration name={illustration} className="mb-6 h-48 w-auto max-w-full md:h-56" />
      <p className="max-w-md text-title-h6 wrap-anywhere">{title}</p>
      <p className="mt-1 max-w-sm text-p-md text-muted">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
