"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { WorkflowStep } from "@/components/workflow-steps";
import { WorkflowTrack } from "@/components/workflow-track";

// The catalogue's Workflows have at most 6 steps a Customer sees. A Location's
// own can have many more, past this they'd push everything else off the page.
const SHOWN_IN_FULL = 7;
const STOPPED = ["CANCELLED", "REJECTED"];

// Around a long Workflow's current step: the one before and the next two.
export function JourneySteps({ steps, currentCode }: { steps: WorkflowStep[]; currentCode: string }) {
  // A stopped Ticket's last step is its CANCELLED or REJECTED, which the hero
  // says already. The track shows how far it got.
  const path = steps.filter(({ code }) => !STOPPED.includes(code));
  const t = useTranslations("tracking");
  const [showAll, setShowAll] = useState(false);
  const long = path.length > SHOWN_IN_FULL;
  const current = path.findIndex((step) => step.code === currentCode);
  const shown = long && !showAll ? path.slice(Math.max(0, current - 1), current + 3) : path;

  return (
    <>
      <WorkflowTrack
        steps={shown}
        currentCode={currentCode}
        reachedCode={path.at(-1)?.code ?? null}
        label={t("progress")}
      />
      {long && (
        <Button variant="link" className="mt-5 self-start" aria-expanded={showAll} onClick={() => setShowAll(!showAll)}>
          {showAll ? t("showFewerSteps") : t("showAllSteps", { count: steps.length })}
        </Button>
      )}
    </>
  );
}
