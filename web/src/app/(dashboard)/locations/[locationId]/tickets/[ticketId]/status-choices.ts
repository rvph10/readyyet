import { isEndedStatus } from "@readyyet/shared";
import type { components } from "@/lib/api/schema";

type Step = components["schemas"]["WorkflowStepDto"];
type Role = components["schemas"]["MyMembershipDto"]["role"];

const STOPPED = ["CANCELLED", "REJECTED"];

export const isStopped = (code: string) => STOPPED.includes(code);

// What ADR 0016 lets this person move the Ticket to, so nothing offered gets
// refused. `next` is the step after the current one, the usual move.
export function statusChoices(steps: Step[], currentCode: string, role: Role) {
  const ended = isEndedStatus(currentCode);
  if (ended && role === "EMPLOYEE") {
    return { next: null, others: [] };
  }
  const allowed = steps.filter(
    ({ status: { code } }) =>
      code !== currentCode && code !== "RECEIVED" && (code !== "COMPLETED" || currentCode === "READY"),
  );
  const position = steps.find(({ status }) => status.code === currentCode)?.position ?? -1;
  const next = ended
    ? null
    : (allowed.find((step) => step.position > position && !isStopped(step.status.code))?.status ?? null);
  return {
    next,
    others: allowed.map(({ status }) => status).filter((status) => status.code !== next?.code),
  };
}
