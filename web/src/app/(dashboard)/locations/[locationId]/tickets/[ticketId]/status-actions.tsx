"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { Icon } from "@/components/ui/icon";
import { Menu } from "@/components/ui/menu";
import type { ActionResult } from "@/lib/api/errors";
import { orFailure } from "@/lib/api/or-failure";
import type { components } from "@/lib/api/schema";
import { statusLabel } from "@/lib/status-label";
import { changeStatus, dismissCollected, undoStatus } from "./actions";
import { isStopped } from "./status-choices";

type Status = components["schemas"]["StatusDto"];

interface Props {
  locationId: string;
  ticketId: string;
  next: Status | null;
  others: Status[];
  // Set while the person looking can still undo the latest change (ADR 0016).
  undoUntil: string | null;
  // The Customer said they collected it, and it's still READY here (ADR 0028).
  collectedAt: string | null;
}

export function StatusActions({ locationId, ticketId, next, others, undoUntil, collectedAt }: Props) {
  const t = useTranslations("ticketDetail");
  const locale = useLocale();
  const [pending, startTransition] = useTransition();
  const [running, setRunning] = useState<string | null>(null);
  const [failure, setFailure] = useState<"conflict" | "unexpected" | null>(null);
  const [expiredUndo, setExpiredUndo] = useState<string | null>(null);

  useEffect(() => {
    if (!undoUntil) return;
    const timer = setTimeout(() => setExpiredUndo(undoUntil), new Date(undoUntil).getTime() - Date.now());
    return () => clearTimeout(timer);
  }, [undoUntil]);

  function run(name: string, action: () => Promise<ActionResult>) {
    setFailure(null);
    startTransition(async () => {
      setRunning(name);
      const result = await orFailure(action());
      // A colleague got there first, and the page now shows what they did.
      if (!result.ok) setFailure(result.code === "CONFLICT" ? "conflict" : "unexpected");
    });
  }

  const canUndo = undoUntil && undoUntil !== expiredUndo;
  if (!next && others.length === 0 && !canUndo && !collectedAt) {
    return <p className="text-p-sm text-muted">{t("endedForEmployee")}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {failure && <FormAlert>{t(`statusErrors.${failure}`)}</FormAlert>}
      {collectedAt && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-subtle p-3">
          <p className="min-w-0 flex-1 text-p-sm">{t("collectedNotice")}</p>
          <Button
            variant="secondary"
            size="sm"
            disabled={pending}
            pending={pending && running === "dismiss"}
            onClick={() => run("dismiss", () => dismissCollected(locationId, ticketId))}
          >
            {t("collectedDismiss")}
          </Button>
        </div>
      )}
      <div className="flex items-center gap-3">
        {next && (
          <Button
            size="lg"
            disabled={pending}
            pending={pending && running === next.code}
            pendingLabel={t("moving")}
            onClick={() => run(next.code, () => changeStatus(locationId, ticketId, next.code))}
            className="min-w-0 flex-1"
          >
            {t("moveTo", { status: statusLabel(next, locale) })}
            <Icon name="arrow-right" className="size-3" />
          </Button>
        )}
        {others.length > 0 && (
          <Menu
            label={t("otherStatuses")}
            items={others.map((status) => ({
              label: statusLabel(status, locale),
              danger: isStopped(status.code),
              disabled: pending,
              onSelect: () => run(status.code, () => changeStatus(locationId, ticketId, status.code)),
            }))}
          />
        )}
      </div>
      {canUndo && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-subtle p-3">
          <p className="min-w-0 flex-1 text-p-sm">{t("undoHint")}</p>
          <Button
            variant="secondary"
            size="sm"
            disabled={pending}
            pending={pending && running === "undo"}
            onClick={() => run("undo", () => undoStatus(locationId, ticketId))}
          >
            {t("undo")}
          </Button>
        </div>
      )}
    </div>
  );
}
