"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { WorkflowSteps, type WorkflowStep } from "@/components/workflow-steps";

// The catalogue's Workflows have at most 6 steps a Customer sees. A Location's
// own can have many more, past this they'd push everything else off the page.
const SHOWN_IN_FULL = 7;

// Around a long Workflow's current step: the one before and the next two.
export function JourneySteps({ steps, currentCode }: { steps: WorkflowStep[]; currentCode: string }) {
  const t = useTranslations("tracking");
  const [showAll, setShowAll] = useState(false);
  const long = steps.length > SHOWN_IN_FULL;
  const current = steps.findIndex((step) => step.code === currentCode);
  const shown = long && !showAll ? steps.slice(Math.max(0, current - 1), current + 3) : steps;

  return (
    <>
      <WorkflowSteps steps={shown} currentCode={currentCode} fill />
      {long && (
        <Button variant="link" className="mt-5 self-start" aria-expanded={showAll} onClick={() => setShowAll(!showAll)}>
          {showAll ? t("showFewerSteps") : t("showAllSteps", { count: steps.length })}
        </Button>
      )}
    </>
  );
}
