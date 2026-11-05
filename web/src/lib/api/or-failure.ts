import { ErrorCode } from "@readyyet/shared";
import { unstable_rethrow } from "next/navigation";
import type { ActionFailure } from "./errors";

// For a form calling a server action. A 5xx is thrown so the server reports it
// (see actionResult), and a dropped connection rejects too: either would reach
// the error page and lose what was typed. Next.js's redirects are thrown as
// well, and aren't failures.
export async function orFailure<T>(action: Promise<T>): Promise<T | ActionFailure> {
  try {
    return await action;
  } catch (error) {
    unstable_rethrow(error);
    return { ok: false, code: ErrorCode.INTERNAL_ERROR };
  }
}
