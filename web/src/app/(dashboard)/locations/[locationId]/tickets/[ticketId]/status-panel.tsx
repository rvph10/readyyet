"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState, useTransition, type ReactNode } from "react";
import { statusTone, toneIcons } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormAlert } from "@/components/ui/form-alert";
import { Icon } from "@/components/ui/icon";
import { Menu } from "@/components/ui/menu";
import { Panel } from "@/components/ui/panel";
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
  status: Status;
  // "2 days late" or "Waiting 3 days", with what tone it deserves.
  flag: { text: string; urgent: boolean } | null;
  since: string;
  next: Status | null;
  others: Status[];
  ended: boolean;
  // Set while the person looking can still undo the latest change (ADR 0016).
  undoUntil: string | null;
  // The Customer said they collected it, and it's still READY here (ADR 0028).
  collectedAt: string | null;
  track: ReactNode;
  className: string;
}

// The Status leads the page. Everything here keeps its place whatever the
// state, so moving a Ticket never shifts what's under it (ADR 0087).
export function StatusPanel({
  locationId,
  ticketId,
  status,
  flag,
  since,
  next,
  others,
  ended,
  undoUntil,
  collectedAt,
  track,
  className,
}: Props) {
  const t = useTranslations("ticketDetail");
  const locale = useLocale();
  const [pending, startTransition] = useTransition();
  const [running, setRunning] = useState<string | null>(null);
  const [failure, setFailure] = useState<"conflict" | "unexpected" | null>(null);
  const [expiredUndo, setExpiredUndo] = useState<string | null>(null);
  const [stopping, setStopping] = useState<Status | null>(null);

  useEffect(() => {
    if (!undoUntil) return;
    const timer = setTimeout(() => setExpiredUndo(undoUntil), new Date(undoUntil).getTime() - Date.now());
    return () => clearTimeout(timer);
  }, [undoUntil]);

  function run(name: string, action: () => Promise<ActionResult>) {
    setFailure(null);
    setStopping(null);
    startTransition(async () => {
      setRunning(name);
      const result = await orFailure(action());
      // A colleague got there first, and the page now shows what they did.
      if (!result.ok) setFailure(result.code === "CONFLICT" ? "conflict" : "unexpected");
    });
  }

  const move = (code: string) => run(code, () => changeStatus(locationId, ticketId, code));
  const canUndo = undoUntil && undoUntil !== expiredUndo;
  const finishes = next?.code === "COMPLETED";

  return (
    <Panel as="section" aria-labelledby="ticket-status" className={`lg:p-7 ${className}`}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-p-sm text-muted">{t("status")}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-2">
            <h2 id="ticket-status" className="text-title-h5">
              {statusLabel(status, locale)}
            </h2>
            {flag && (
              <span
                className={`inline-flex min-h-8 items-center gap-1.5 rounded-xl px-2.5 text-label-xs font-semibold ${
                  flag.urgent ? "bg-danger-subtle text-danger" : "bg-subtle text-ink"
                }`}
              >
                <Icon name="time" className="size-3" />
                {flag.text}
              </span>
            )}
          </div>
          {/* Two lines kept for the longest of these, so nothing under it moves. */}
          <p className="mt-1 min-h-11 max-w-md text-p-sm text-muted">
            {canUndo ? t("undoHint") : ended ? t(others.length > 0 ? "endedNote" : "endedForEmployee") : since}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canUndo && (
            <Button
              variant="secondary"
              disabled={pending}
              pending={pending && running === "undo"}
              onClick={() => run("undo", () => undoStatus(locationId, ticketId))}
            >
              {t("undo")}
            </Button>
          )}
          {next && (
            <Button
              disabled={pending}
              pending={pending && running === next.code}
              pendingLabel={t("moving")}
              onClick={() => move(next.code)}
              className="min-w-0 flex-1 lg:flex-none"
            >
              {finishes ? t("handOver") : t("moveTo", { status: statusLabel(next, locale) })}
              <Icon name="arrow-right" className="size-2.5" />
            </Button>
          )}
          {others.length > 0 && (
            <Menu
              label={ended ? t("reopen") : t("changeStatus")}
              labelShown
              className="w-full lg:w-auto"
              items={others.map((option) => {
                const stops = isStopped(option.code);
                return {
                  label: statusLabel(option, locale),
                  icon: stops ? "ban" : toneIcons[statusTone(option.code)],
                  section: stops ? t("endSection") : t(ended ? "backToWork" : "moveSection"),
                  hint: stops ? t(option.code === "CANCELLED" ? "cancelledHint" : "rejectedHint") : undefined,
                  danger: stops,
                  disabled: pending,
                  onSelect: () => (stops ? setStopping(option) : move(option.code)),
                };
              })}
            />
          )}
        </div>
      </div>

      {failure && (
        <div className="mt-5">
          <FormAlert>{t(`statusErrors.${failure}`)}</FormAlert>
        </div>
      )}

      <div className="mt-5 lg:mt-6">{track}</div>

      {collectedAt && (
        <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl bg-warning-subtle p-3">
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

      <Dialog
        open={stopping !== null}
        onClose={() => setStopping(null)}
        title={stopping ? t("stopTitle", { status: statusLabel(stopping, locale).toLowerCase() }) : ""}
        variant="destructive"
      >
        <p className="text-p-sm text-muted">{t("stopHint")}</p>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setStopping(null)}>
            {t("keepGoing")}
          </Button>
          {stopping && (
            <Button variant="danger" onClick={() => move(stopping.code)}>
              {statusLabel(stopping, locale)}
            </Button>
          )}
        </div>
      </Dialog>
    </Panel>
  );
}
