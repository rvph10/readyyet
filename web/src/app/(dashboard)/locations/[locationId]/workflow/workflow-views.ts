import { SYSTEM_STATUS_CODES } from "@readyyet/shared";
import type { components } from "@/lib/api/schema";

type CatalogueStatus = components["schemas"]["CatalogueStatusDto"];
type Step = { status: { code: string } };

// The kinds of step a shop chooses from, in the order a job meets them. The
// system Statuses have their own tones and are placed by the API (ADR 0035).
export const STEP_GROUPS = ["received", "working", "waiting"] as const;
export type StepGroup = (typeof STEP_GROUPS)[number];

const isSystem = (code: string) => (SYSTEM_STATUS_CODES as readonly string[]).includes(code);

// What the API's PUT takes: the steps between RECEIVED and READY.
export function chosenCodes(steps: Step[]) {
  return steps.map(({ status }) => status.code).filter((code) => !isSystem(code));
}

export function moveStep(codes: string[], code: string, toIndex: number) {
  const rest = codes.filter((other) => other !== code);
  const index = Math.min(Math.max(toIndex, 0), rest.length);
  return [...rest.slice(0, index), code, ...rest.slice(index)];
}

export function sameSteps(a: string[], b: string[]) {
  return a.length === b.length && a.every((code, index) => code === b[index]);
}

// What's left to add, by kind, matching what's typed whatever its accents.
export function addableSteps(
  statuses: CatalogueStatus[],
  chosen: string[],
  query: string,
  labelOf: (status: CatalogueStatus) => string,
  toneOf: (code: string) => string,
) {
  const fold = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  const wanted = fold(query.trim());
  const open = statuses.filter(
    (status) => !status.isSystem && !chosen.includes(status.code) && fold(labelOf(status)).includes(wanted),
  );
  return STEP_GROUPS.map((group) => ({
    group,
    statuses: open.filter(({ code }) => toneOf(code) === group),
  })).filter(({ statuses: inGroup }) => inGroup.length > 0);
}
